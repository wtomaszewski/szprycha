"""Validate the native configuration and, when provided, the actual Android APK."""
from html import unescape
import json
import os
from pathlib import Path
import plistlib
import re
import subprocess
import sys
from xml.etree import ElementTree

ANDROID = "{http://schemas.android.com/apk/res/android}"
TOOLS = "{http://schemas.android.com/tools}"
LANDSCAPE = {"UIInterfaceOrientationLandscapeLeft", "UIInterfaceOrientationLandscapeRight"}


def require(condition, message):
    if not condition:
        sys.exit(message)


android = Path("android/app/src/main/AndroidManifest.xml")
manifest = ElementTree.parse(android).getroot()
permissions = [
    node.get(ANDROID + "name")
    for node in manifest
    if node.tag.startswith("uses-permission") and node.get(TOOLS + "node") != "remove"
]
require(set(permissions) <= {"android.permission.VIBRATE"}, f"Unexpected permissions: {permissions}")
require(
    manifest.find("application/activity").get(ANDROID + "screenOrientation") == "sensorLandscape",
    "Android activity must start in landscape",
)

ios = Path("ios/App/App")
with (ios / "Info.plist").open("rb") as file:
    info = plistlib.load(file)
for key in ("UISupportedInterfaceOrientations", "UISupportedInterfaceOrientations~ipad"):
    require(set(info[key]) == LANDSCAPE, f"Expected landscape-only orientations in {key}")
require(info["UIRequiresFullScreen"] and info["UIStatusBarHidden"], "Expected fullscreen iOS")
require(
    not any(key.startswith("NS") and key.endswith("UsageDescription") for key in info),
    "Unexpected iOS permission prompt",
)
with (ios / "PrivacyInfo.xcprivacy").open("rb") as file:
    privacy = plistlib.load(file)
require(not privacy["NSPrivacyTracking"] and not privacy["NSPrivacyCollectedDataTypes"],
        "Expected local-only data in the iOS privacy manifest")
require(
    {"NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryUserDefaults",
     "NSPrivacyAccessedAPITypeReasons": ["CA92.1"]} in privacy["NSPrivacyAccessedAPITypes"],
    "Missing UserDefaults privacy declaration",
)
project = (ios.parent / "App.xcodeproj/project.pbxproj").read_text()
require("PrivacyInfo.xcprivacy in Resources" in project and "DEVELOPMENT_TEAM" not in project,
        "Expected bundled privacy manifest and no signing team")

platforms = {"ios": ios, "android": android.parent / "assets"}
for name in sys.argv[1:2] or platforms:
    platform = platforms[name]
    config = json.loads((platform / "capacitor.config.json").read_text())
    require(not config.get("server", {}).get("url") and not config.get("server", {}).get("allowNavigation"),
            "Capacitor must load local assets")
    require(config["plugins"]["SystemBars"]["hidden"], "Expected hidden system bars")
    public = platform / "public"
    html = unescape((public / "index.html").read_text())
    require("Content-Security-Policy" in html and "connect-src 'self' capacitor://localhost" in html,
            "Run the mobile web build before syncing")
    for asset in ("data/content.json", "THIRD_PARTY_NOTICES"):
        require((public / asset).is_file(), f"Missing {asset} in {public}")
    require("THIRD_PARTY_NOTICES_MOBILE" in (public / "THIRD_PARTY_NOTICES").read_text(),
            "Missing native license notices")

if len(sys.argv) > 2:
    apk = sys.argv[2]
    sdk = Path(os.environ["ANDROID_HOME"]) / "build-tools/36.0.0"
    aapt = str(sdk / "aapt2")
    permissions = subprocess.check_output([aapt, "dump", "permissions", apk], text=True)
    names = set(re.findall(r"""^uses-permission(?:-sdk-\d+)?: name=['"]([^'"]+)""", permissions, re.M))
    require(names == {"android.permission.VIBRATE"}, f"Unexpected APK permissions: {permissions}")
    badging = subprocess.check_output([aapt, "dump", "badging", apk], text=True)
    require("application-debuggable" in badging, "Expected a debug APK")
    signed = subprocess.run([str(sdk / "apksigner"), "verify", apk],
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    require(signed.returncode == 1 and "Missing META-INF/MANIFEST.MF" in signed.stdout,
            f"Expected an unsigned APK, got:\n{signed.stdout}")

print("Mobile configuration verified")
