APP = MultiClip.app

.PHONY: build app run clean

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
	open $(APP)

clean:
	rm -rf .build $(APP)
