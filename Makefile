
all:
	@echo "Usage:"
	@echo "    make push:"
	@echo "        Push code to GAS using clasp"
	@echo "    make pull:"
	@echo "        Pull code from GAS using clasp"
	@echo ""
	@echo "Requirement:"
	@echo "    Please install clasp and login to the google account"
	@echo "        https://github.com/google/clasp"
	@echo ""
	@echo "How to push/pull Github:"
	@echo "    Please use git command directly."

push: check_clasp
	@echo "Pushing code to GAS"
	@clasp push

pull: check_clasp
	@echo "Pulling code from GAS"
	@clasp pull

check_clasp:
	@echo Checking clasp binary
	@which clasp > /dev/null

