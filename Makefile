SHELL := /bin/bash
CHANGESET_SCRIPT := node scripts/create-changeset.js
BUMP ?= patch

.PHONY: changeset changeset-dry-run version publish release

changeset:
	@if [ -z "$(SUMMARY)" ] && [ -z "$(SUMMARY_FILE)" ]; then \
		echo "Error: provide SUMMARY=\"...\" or SUMMARY_FILE=path"; \
		exit 1; \
	fi; \
	PACKAGES="$(PACKAGES)" SUMMARY="$(SUMMARY)" SUMMARY_FILE="$(SUMMARY_FILE)" BUMP="$(BUMP)" $(CHANGESET_SCRIPT)

changeset-dry-run:
	@if [ -z "$(SUMMARY)" ] && [ -z "$(SUMMARY_FILE)" ]; then \
		echo "Error: provide SUMMARY=\"...\" or SUMMARY_FILE=path"; \
		exit 1; \
	fi; \
	PACKAGES="$(PACKAGES)" SUMMARY="$(SUMMARY)" SUMMARY_FILE="$(SUMMARY_FILE)" BUMP="$(BUMP)" DRY_RUN=true $(CHANGESET_SCRIPT)

version:
	pnpm changeset version
	pnpm install

publish:
	pnpm changeset publish

release: version publish
