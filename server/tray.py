"""
Cross-platform system tray indicator for Uzi Library.
Supports native Linux desktop (StatusNotifierItem + DBusMenu) on GNOME/KDE/Wayland,
and falls back to pystray on Windows or environments without D-Bus.
"""

import os
import sys
import logging
import threading
import subprocess
import webbrowser
from pathlib import Path
from typing import Optional, Callable

logger = logging.getLogger("uzi_library.tray")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ICONS_DIR = str(PROJECT_ROOT / "icons")
ICON_PNG = PROJECT_ROOT / "icons" / "uzi-library.png"
ICON_ICO = PROJECT_ROOT / "icons" / "uzi-library.ico"
ICON_ACTIVE = PROJECT_ROOT / "icons" / "uzi-library-active.png"

# Check D-Bus availability (Linux native)
HAS_DBUS = False
if sys.platform.startswith("linux"):
    try:
        import dbus
        import dbus.service
        import dbus.mainloop.glib
        from gi.repository import GLib
        HAS_DBUS = True
    except ImportError as e:
        logger.debug("D-Bus or GLib not available: %s", e)

# Check pystray availability (Windows / fallback)
HAS_PYSTRAY = False
if sys.platform == "win32":
    try:
        import pystray
        from PIL import Image
        HAS_PYSTRAY = True
    except ImportError:
        pass


def open_web_ui(url: str = "http://localhost:8000"):
    """Open Uzi Library web application in default browser."""
    try:
        webbrowser.open(url)
    except Exception as e:
        logger.error("Failed to open web browser: %s", e)


def get_active_books_path() -> Optional[str]:
    """Retrieve path of active library folder from server configuration."""
    try:
        from server.config import ConfigManager
        cfg = ConfigManager()
        active = cfg.get_active_library()
        if active and active.get("path"):
            return active["path"]
        libs = cfg.get_libraries()
        if libs and libs[0].get("path"):
            return libs[0]["path"]
    except Exception as e:
        logger.debug("Could not determine books path: %s", e)
    return None


def open_library_folder():
    """Open active books folder in native file manager."""
    path = get_active_books_path()
    if not path or not os.path.exists(path):
        open_web_ui()
        return

    try:
        if sys.platform == "win32":
            os.startfile(path)
        elif sys.platform == "darwin":
            subprocess.Popen(["open", path])
        else:
            subprocess.Popen(["xdg-open", path])
    except Exception as e:
        logger.error("Failed to open library folder: %s", e)


def open_terminal_logs():
    """Launch terminal emulator following journalctl logs on Linux."""
    cmd = ["journalctl", "--user", "-u", "uzi-library.service", "-f"]
    for term in ["ptyxis", "gnome-terminal", "konsole", "xterm", "alacritty", "kitty"]:
        if subprocess.run(["which", term], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0:
            if term in ("ptyxis", "gnome-terminal"):
                subprocess.Popen([term, "--"] + cmd)
            else:
                subprocess.Popen([term, "-e", " ".join(cmd)])
            return
    # Fallback to direct execution
    subprocess.Popen(cmd)


def restart_service():
    """Restart background service."""
    if sys.platform.startswith("linux"):
        subprocess.Popen(["systemctl", "--user", "restart", "uzi-library.service"])


def stop_service():
    """Stop background service."""
    if sys.platform.startswith("linux"):
        subprocess.Popen(["systemctl", "--user", "stop", "uzi-library.service"])
    else:
        sys.exit(0)


# =========================================================================
# Linux D-Bus StatusNotifierItem Implementation
# =========================================================================
if HAS_DBUS:

    class StatusNotifierItem(dbus.service.Object):
        """Implements org.kde.StatusNotifierItem D-Bus interface."""

        def __init__(self, bus: dbus.Bus, object_path: str, menu_path: str):
            super().__init__(bus, object_path)
            self.menu_path = menu_path
            self.icon_name = "uzi-library-active"
            self.title = "Uzi Library: Online"
            self.status = "Active"

        @dbus.service.method("org.freedesktop.DBus.Properties", in_signature="ss", out_signature="v")
        def Get(self, interface: str, prop: str):
            if prop == "Category":
                return "ApplicationStatus"
            elif prop == "Id":
                return "uzi-library"
            elif prop == "Title":
                return self.title
            elif prop == "Status":
                return self.status
            elif prop == "IconName":
                return self.icon_name
            elif prop == "IconThemePath":
                return ICONS_DIR
            elif prop == "Menu":
                return dbus.ObjectPath(self.menu_path)
            elif prop == "ItemIsMenu":
                return False
            return ""

        @dbus.service.method("org.freedesktop.DBus.Properties", in_signature="s", out_signature="a{sv}")
        def GetAll(self, interface: str):
            return {
                "Category": "ApplicationStatus",
                "Id": "uzi-library",
                "Title": self.title,
                "Status": self.status,
                "IconName": self.icon_name,
                "IconThemePath": ICONS_DIR,
                "Menu": dbus.ObjectPath(self.menu_path),
                "ItemIsMenu": False,
            }

        @dbus.service.signal("org.kde.StatusNotifierItem")
        def NewIcon(self):
            pass

        @dbus.service.signal("org.kde.StatusNotifierItem")
        def NewStatus(self, status: str):
            pass

        @dbus.service.signal("org.kde.StatusNotifierItem")
        def NewTitle(self):
            pass

        @dbus.service.method("org.kde.StatusNotifierItem", in_signature="ii", out_signature="")
        def Activate(self, x: int = 0, y: int = 0):
            # Left click: open Web UI in browser
            open_web_ui()

        @dbus.service.method("org.kde.StatusNotifierItem", in_signature="ii", out_signature="")
        def SecondaryActivate(self, x: int = 0, y: int = 0):
            pass

        @dbus.service.method("org.kde.StatusNotifierItem", in_signature="is", out_signature="")
        def Scroll(self, delta: int, orientation: str):
            pass

        def update_icon(self, icon_name: str, title: str):
            changed = False
            if self.icon_name != icon_name:
                self.icon_name = icon_name
                self.NewIcon()
                changed = True
            if self.title != title:
                self.title = title
                self.NewTitle()
                changed = True
            return changed


    class DBusMenu(dbus.service.Object):
        """Implements com.canonical.dbusmenu D-Bus interface for top-panel dropdown."""

        def __init__(self, bus: dbus.Bus, object_path: str, app: "LinuxTrayApp"):
            super().__init__(bus, object_path)
            self.app = app
            self.revision = 1
            self.callbacks: dict[int, Callable[[], None]] = {}

        @dbus.service.method("com.canonical.dbusmenu", in_signature="iias", out_signature="u(ia{sv}av)")
        def GetLayout(self, parent_id: int, recursion_depth: int, property_names: list):
            items = []
            self.callbacks.clear()
            item_id = 1

            empty_children = dbus.Array([], signature="v")
            empty_props = dbus.Dictionary({}, signature="sv")

            # 1. Header (Title)
            items.append((
                dbus.Int32(item_id),
                dbus.Dictionary({
                    "label": dbus.String("📖 Uzi Library: Online", variant_level=1),
                    "enabled": dbus.Boolean(False, variant_level=1),
                }, signature="sv"),
                empty_children
            ))
            item_id += 1

            # 2. Host / Status
            items.append((
                dbus.Int32(item_id),
                dbus.Dictionary({
                    "label": dbus.String(f"    🟢 Local: http://localhost:{self.app.port}", variant_level=1),
                    "enabled": dbus.Boolean(False, variant_level=1),
                }, signature="sv"),
                empty_children
            ))
            item_id += 1

            # Separator
            items.append((
                dbus.Int32(item_id),
                dbus.Dictionary({"type": dbus.String("separator", variant_level=1)}, signature="sv"),
                empty_children
            ))
            item_id += 1

            # 3. Open Web UI Action
            web_id = item_id
            self.callbacks[web_id] = lambda: open_web_ui(f"http://localhost:{self.app.port}")
            items.append((
                dbus.Int32(item_id),
                dbus.Dictionary({
                    "label": dbus.String("🌐 Abrir no Navegador (Web UI)", variant_level=1),
                    "enabled": dbus.Boolean(True, variant_level=1),
                }, signature="sv"),
                empty_children
            ))
            item_id += 1

            # 4. Open Books Folder Action
            folder_id = item_id
            self.callbacks[folder_id] = open_library_folder
            items.append((
                dbus.Int32(item_id),
                dbus.Dictionary({
                    "label": dbus.String("📁 Abrir Pasta de Livros", variant_level=1),
                    "enabled": dbus.Boolean(True, variant_level=1),
                }, signature="sv"),
                empty_children
            ))
            item_id += 1

            # Separator
            items.append((
                dbus.Int32(item_id),
                dbus.Dictionary({"type": dbus.String("separator", variant_level=1)}, signature="sv"),
                empty_children
            ))
            item_id += 1

            # 5. View Logs Action
            logs_id = item_id
            self.callbacks[logs_id] = open_terminal_logs
            items.append((
                dbus.Int32(item_id),
                dbus.Dictionary({
                    "label": dbus.String("📋 Ver Logs em Tempo Real", variant_level=1),
                    "enabled": dbus.Boolean(True, variant_level=1),
                }, signature="sv"),
                empty_children
            ))
            item_id += 1

            # 6. Restart Service Action
            restart_id = item_id
            self.callbacks[restart_id] = restart_service
            items.append((
                dbus.Int32(item_id),
                dbus.Dictionary({
                    "label": dbus.String("🔄 Reiniciar Servico", variant_level=1),
                    "enabled": dbus.Boolean(True, variant_level=1),
                }, signature="sv"),
                empty_children
            ))
            item_id += 1

            # 7. Stop Service Action
            stop_id = item_id
            self.callbacks[stop_id] = stop_service
            items.append((
                dbus.Int32(item_id),
                dbus.Dictionary({
                    "label": dbus.String("⏹️ Parar Servico", variant_level=1),
                    "enabled": dbus.Boolean(True, variant_level=1),
                }, signature="sv"),
                empty_children
            ))
            item_id += 1

            root = (dbus.Int32(0), empty_props, dbus.Array(items, signature="(ia{sv}av)"))
            return (dbus.UInt32(self.revision), root)

        @dbus.service.method("com.canonical.dbusmenu", in_signature="aias", out_signature="a(ia{sv})")
        def GetGroupProperties(self, ids: list, property_names: list):
            return []

        @dbus.service.method("com.canonical.dbusmenu", in_signature="is", out_signature="v")
        def GetProperty(self, id: int, name: str):
            return ""

        @dbus.service.method("com.canonical.dbusmenu", in_signature="isvu", out_signature="")
        def Event(self, id: int, event_id: str, data: str, timestamp: int):
            if event_id == "clicked":
                cb = self.callbacks.get(int(id))
                if cb:
                    cb()

        @dbus.service.signal("com.canonical.dbusmenu", signature="ui")
        def LayoutUpdated(self, revision: int, parent: int):
            pass

        def notify_update(self):
            self.revision += 1
            self.LayoutUpdated(self.revision, 0)


    class LinuxTrayApp:
        """Controller for the Linux StatusNotifierItem system tray."""

        def __init__(self, port: int = 8000):
            self.port = port
            self.loop: Optional[GLib.MainLoop] = None
            dbus.mainloop.glib.DBusGMainLoop(set_as_default=True)
            self.bus = dbus.SessionBus()

            self.menu = DBusMenu(self.bus, "/MenuBar", self)
            self.sni = StatusNotifierItem(self.bus, "/StatusNotifierItem", "/MenuBar")

            pid = os.getpid()
            self.bus_name = dbus.service.BusName(
                f"org.kde.StatusNotifierItem-{pid}-1",
                self.bus,
            )

            self.register_tray()

        def register_tray(self):
            for watcher_name in ["org.kde.StatusNotifierWatcher", "org.ayatana.StatusNotifierWatcher"]:
                try:
                    watcher = self.bus.get_object(watcher_name, "/StatusNotifierWatcher")
                    watcher.RegisterStatusNotifierItem("/StatusNotifierItem", dbus_interface=watcher_name)
                    logger.info("Registered Uzi Library tray with %s", watcher_name)
                    return
                except Exception:
                    pass
            logger.debug("StatusNotifierWatcher registration handled by AppIndicator bus scanner.")

        def run(self):
            self.loop = GLib.MainLoop()
            self.loop.run()

        def stop(self):
            if self.loop and self.loop.is_running():
                self.loop.quit()


# =========================================================================
# Windows / Generic pystray Implementation
# =========================================================================
class WindowsTrayApp:
    """Controller for Windows system tray using pystray."""

    def __init__(self, port: int = 8000):
        self.port = port
        self.icon = None

    def run(self):
        if not HAS_PYSTRAY:
            logger.warning("pystray not installed; skipping Windows system tray.")
            return

        icon_image = None
        if ICON_ICO.exists():
            try:
                icon_image = Image.open(str(ICON_ICO))
            except Exception:
                pass
        if not icon_image and ICON_PNG.exists():
            try:
                icon_image = Image.open(str(ICON_PNG))
            except Exception:
                pass

        if not icon_image:
            logger.warning("No icon image found for tray.")
            return

        menu = pystray.Menu(
            pystray.MenuItem("📖 Uzi Library: Online", None, enabled=False),
            pystray.MenuItem(f"    🟢 Local: http://localhost:{self.port}", None, enabled=False),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("🌐 Abrir no Navegador", lambda: open_web_ui(f"http://localhost:{self.port}"), default=True),
            pystray.MenuItem("📁 Abrir Pasta de Livros", open_library_folder),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("⏹️ Encerrar", self.stop),
        )

        self.icon = pystray.Icon("uzi-library", icon_image, "Uzi Library", menu)
        self.icon.run()

    def stop(self):
        if self.icon:
            self.icon.stop()


# =========================================================================
# Global Tray Management
# =========================================================================
_ACTIVE_TRAY = None


def start_tray_in_background(port: int = 8000) -> Optional[object]:
    """Initialize and start the system tray icon in a dedicated daemon thread."""
    global _ACTIVE_TRAY

    if os.environ.get("ENABLE_TRAY_ICON", "1").lower() in ("0", "false", "no"):
        logger.info("System tray disabled via ENABLE_TRAY_ICON environment variable.")
        return None

    # Linux native path
    if HAS_DBUS:
        if not os.environ.get("DBUS_SESSION_BUS_ADDRESS") and not os.environ.get("DISPLAY") and not os.environ.get("WAYLAND_DISPLAY"):
            logger.info("No graphical session detected; skipping system tray.")
            return None

        try:
            app = LinuxTrayApp(port=port)
            thread = threading.Thread(target=app.run, name="UziLibraryTray", daemon=True)
            thread.start()
            _ACTIVE_TRAY = app
            logger.info("Uzi Library Linux system tray started in background.")
            return app
        except Exception as e:
            logger.warning("Could not initialize Linux system tray: %s", e)

    # Windows pystray path
    elif sys.platform == "win32" and HAS_PYSTRAY:
        try:
            app = WindowsTrayApp(port=port)
            thread = threading.Thread(target=app.run, name="UziLibraryTrayWin", daemon=True)
            thread.start()
            _ACTIVE_TRAY = app
            logger.info("Uzi Library Windows system tray started in background.")
            return app
        except Exception as e:
            logger.warning("Could not initialize Windows system tray: %s", e)

    return None


def stop_tray():
    """Stop active tray icon if running."""
    global _ACTIVE_TRAY
    if _ACTIVE_TRAY and hasattr(_ACTIVE_TRAY, "stop"):
        try:
            _ACTIVE_TRAY.stop()
        except Exception:
            pass
        _ACTIVE_TRAY = None
