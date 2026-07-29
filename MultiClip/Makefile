APP = MultiClip.app

.PHONY: build app run install clean

build:
	swift build -c release

app: build
	rm -rf $(APP)
	mkdir -p $(APP)/Contents/MacOS
	cp Info.plist $(APP)/Contents/Info.plist
	cp .build/release/MultiClip $(APP)/Contents/MacOS/MultiClip
	codesign --force --sign - $(APP)
	@echo ""
	@echo "NOTE: rebuilding re-signs the app, which invalidates a previously"
	@echo "granted Accessibility permission even if its checkbox still looks on."
	@echo "If auto-paste stops working after a rebuild, run:"
	@echo "    tccutil reset Accessibility com.cesca.multiclip"
	@echo "then relaunch and grant the permission again."

run: app
	@# 'open' won't relaunch an already-running app, so kill any old
	@# instance first - otherwise rebuilds silently keep running old code.
	-pkill -x MultiClip 2>/dev/null; sleep 0.5
	open $(APP)

install: app
	@# Install into /Applications so the app has a stable home for the
	@# Accessibility permission and the start-at-login item.
	-pkill -x MultiClip 2>/dev/null; sleep 0.5
	rm -rf /Applications/MultiClip.app
	cp -R $(APP) /Applications/MultiClip.app
	open /Applications/MultiClip.app
	@echo ""
	@echo "Installed to /Applications/MultiClip.app and launched."
	@echo "Turn on 'Start MultiClip automatically when you log in' in its"
	@echo "Settings window to keep it always active."

clean:
	rm -rf .build $(APP)
