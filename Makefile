REPO_ROOT := $(CURDIR)
FRONTEND_DIR := $(REPO_ROOT)/frontend
ANDROID_DIR := $(FRONTEND_DIR)/android
JDK_DIR := $(ANDROID_DIR)/.jdk
JDK_VERSION := jdk-21.0.5+11
JDK_ARCHIVE := OpenJDK21U-jdk_x64_linux_hotspot_21.0.5_11.tar.gz
JDK_URL := https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.5%2B11/$(JDK_ARCHIVE)
JAVA_HOME := $(JDK_DIR)/$(JDK_VERSION)
GRADLE_USER_HOME := $(ANDROID_DIR)/.gradle

.PHONY: install frontend-build cap-sync android-install ensure-jdk

install: android-install

frontend-build:
	cd $(FRONTEND_DIR) && npm install
	cd $(FRONTEND_DIR) && npm run build

cap-sync: frontend-build
	cd $(FRONTEND_DIR) && npx cap sync android

ensure-jdk:
	mkdir -p $(JDK_DIR)
	if [ ! -d "$(JAVA_HOME)" ]; then \
		curl -L -o $(JDK_DIR)/$(JDK_ARCHIVE) "$(JDK_URL)"; \
		tar -xzf $(JDK_DIR)/$(JDK_ARCHIVE) -C $(JDK_DIR); \
	fi

android-install: ensure-jdk cap-sync
	cd $(ANDROID_DIR) && JAVA_HOME=$(JAVA_HOME) PATH=$(JAVA_HOME)/bin:$$PATH GRADLE_USER_HOME=$(GRADLE_USER_HOME) ./gradlew installDebug
