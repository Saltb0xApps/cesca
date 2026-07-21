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

run: app
	open $(APP)

clean:
	rm -rf .build $(APP)
