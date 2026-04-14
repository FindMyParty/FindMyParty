#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------
# create-service.sh
# Creates a new microservice from the skeleton-service template.
#
# Usage:
#   ./scripts/create-service.sh <service-name> [entity-name]
#
# Examples:
#   ./scripts/create-service.sh profile user
#   ./scripts/create-service.sh chat message
#   ./scripts/create-service.sh match            # entity defaults to "item"
#
# The script copies skeleton-service/, renames files and replaces
# references so the new service is ready to develop immediately.
# ------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SKELETON_DIR="$ROOT_DIR/skeleton-service"

SERVICE_NAME="${1:-}"
ENTITY_NAME="${2:-item}"

if [[ -z "$SERVICE_NAME" ]]; then
  echo "Usage: $0 <service-name> [entity-name]"
  echo ""
  echo "  service-name   Name of the new service (e.g. profile, chat, match)"
  echo "  entity-name    Primary domain entity (default: item)"
  echo ""
  echo "Examples:"
  echo "  $0 profile user"
  echo "  $0 chat message"
  exit 1
fi

# Validate names — lowercase, letters and hyphens only
if [[ ! "$SERVICE_NAME" =~ ^[a-z][a-z0-9-]*$ ]]; then
  echo "Error: service-name must be lowercase alphanumeric with optional hyphens (e.g. 'profile', 'chat-room')"
  exit 1
fi

if [[ ! "$ENTITY_NAME" =~ ^[a-z][a-z0-9]*$ ]]; then
  echo "Error: entity-name must be lowercase alphanumeric (e.g. 'user', 'message')"
  exit 1
fi

TARGET_DIR="$ROOT_DIR/${SERVICE_NAME}-service"

if [[ -d "$TARGET_DIR" ]]; then
  echo "Error: Directory '$TARGET_DIR' already exists."
  exit 1
fi

if [[ ! -d "$SKELETON_DIR" ]]; then
  echo "Error: Skeleton service not found at '$SKELETON_DIR'."
  exit 1
fi

# ------------------------------------------------------------------
# Helper: capitalize first letter (Item, User, Message)
# ------------------------------------------------------------------
capitalize() {
  echo "$(echo "${1:0:1}" | tr '[:lower:]' '[:upper:]')${1:1}"
}

ENTITY_UPPER="$(capitalize "$ENTITY_NAME")"
ITEM_UPPER="Item"

echo "Creating ${SERVICE_NAME}-service with entity '${ENTITY_NAME}' (${ENTITY_UPPER})..."

# ------------------------------------------------------------------
# 1. Copy skeleton, excluding node_modules and package-lock.json
# ------------------------------------------------------------------
mkdir -p "$TARGET_DIR"
cd "$SKELETON_DIR"
find . -type f \
  -not -path './node_modules/*' \
  -not -name 'package-lock.json' | while read -r f; do
  dir="$(dirname "$f")"
  mkdir -p "$TARGET_DIR/$dir"
  cp "$f" "$TARGET_DIR/$f"
done
cd "$ROOT_DIR"

# ------------------------------------------------------------------
# 2. Rename files containing "item" in their names
# ------------------------------------------------------------------
# Process deepest files first so directory renames don't break paths
find "$TARGET_DIR" -name "*item*" -type f | sort -r | while read -r filepath; do
  dir="$(dirname "$filepath")"
  old_name="$(basename "$filepath")"
  new_name="${old_name//item/$ENTITY_NAME}"
  if [[ "$old_name" != "$new_name" ]]; then
    mv "$filepath" "$dir/$new_name"
  fi
done

# ------------------------------------------------------------------
# 3. Replace content in all JS files, .env.example, package.json, Dockerfile
# ------------------------------------------------------------------

# Files to process
find "$TARGET_DIR" -type f \( -name "*.js" -o -name "*.json" -o -name ".env.example" -o -name "Dockerfile" \) | while read -r filepath; do
  # Skip node_modules (shouldn't exist, but just in case)
  [[ "$filepath" == *node_modules* ]] && continue

  # Replace skeleton → service name (in routing keys, service names, comments)
  # Replace item/Item → entity name (class names, variable names, file references)
  sed -i \
    -e "s/skeleton-service/${SERVICE_NAME}-service/g" \
    -e "s/skeleton\.item/${SERVICE_NAME}.${ENTITY_NAME}/g" \
    -e "s/skeleton/${SERVICE_NAME}/g" \
    -e "s/ItemUseCase/${ENTITY_UPPER}UseCase/g" \
    -e "s/ItemService/${ENTITY_UPPER}Service/g" \
    -e "s/ItemStatus/${ENTITY_UPPER}Status/g" \
    -e "s/InMemoryItemRepository/InMemory${ENTITY_UPPER}Repository/g" \
    -e "s/itemRepository/${ENTITY_NAME}Repository/g" \
    -e "s/itemUseCase/${ENTITY_NAME}UseCase/g" \
    -e "s/itemService/${ENTITY_NAME}Service/g" \
    -e "s/createItem/create${ENTITY_UPPER}/g" \
    -e "s/getItemById/get${ENTITY_UPPER}ById/g" \
    -e "s/listItems/list${ENTITY_UPPER}s/g" \
    -e "s/updateItem/update${ENTITY_UPPER}/g" \
    -e "s/deleteItem/delete${ENTITY_UPPER}/g" \
    -e "s/activateItem/activate${ENTITY_UPPER}/g" \
    -e "s/deactivateItem/deactivate${ENTITY_UPPER}/g" \
    -e "s/\"Item\"/\"${ENTITY_UPPER}\"/g" \
    -e "s/item\.routes/${ENTITY_NAME}.routes/g" \
    -e "s/item-use-case\.port/${ENTITY_NAME}-use-case.port/g" \
    -e "s/item-repository\.port/${ENTITY_NAME}-repository.port/g" \
    -e "s/in-memory-item/in-memory-${ENTITY_NAME}/g" \
    -e "s/item\.use-case/${ENTITY_NAME}.use-case/g" \
    -e "s/item\.service/${ENTITY_NAME}.service/g" \
    -e "s/item\.js/${ENTITY_NAME}.js/g" \
    -e "s/Item\.create/${ENTITY_UPPER}.create/g" \
    -e "s/Item\.fromPersistence/${ENTITY_UPPER}.fromPersistence/g" \
    -e "s/new Item(/new ${ENTITY_UPPER}(/g" \
    -e "s/class Item /class ${ENTITY_UPPER} /g" \
    -e "s/{ Item }/{ ${ENTITY_UPPER} }/g" \
    -e "s/{ Item,/{ ${ENTITY_UPPER},/g" \
    -e "s/, Item }/, ${ENTITY_UPPER} }/g" \
    -e "s/\/items/\/${ENTITY_NAME}s/g" \
    -e "s/itemRoutes/${ENTITY_NAME}Routes/g" \
    -e "s/Item routes/${ENTITY_UPPER} routes/g" \
    -e "s/Item domain/${ENTITY_UPPER} domain/g" \
    -e "s/Item entity/${ENTITY_UPPER} entity/g" \
    -e "s/Item repository/${ENTITY_UPPER} repository/g" \
    -e "s/Item use case/${ENTITY_UPPER} use case/g" \
    -e "s/Item persistence/${ENTITY_UPPER} persistence/g" \
    -e "s/toBeInstanceOf(Item)/toBeInstanceOf(${ENTITY_UPPER})/g" \
    -e "s/instanceof Item/instanceof ${ENTITY_UPPER}/g" \
    -e "s/)\.Item/)\.${ENTITY_UPPER}/g" \
    -e "s/IItemRepository/I${ENTITY_UPPER}Repository/g" \
    -e "s/IItemUseCase/I${ENTITY_UPPER}UseCase/g" \
    "$filepath"
done

# ------------------------------------------------------------------
# 4. Install dependencies
# ------------------------------------------------------------------
echo ""
echo "Installing dependencies..."
cd "$TARGET_DIR" && npm install
cd "$ROOT_DIR"

# ------------------------------------------------------------------
# Done
# ------------------------------------------------------------------
echo ""
echo "------------------------------------------------------"
echo "  ${SERVICE_NAME}-service created successfully!"
echo "------------------------------------------------------"
echo ""
echo "Next steps:"
echo "  cd ${SERVICE_NAME}-service"
echo "  cp .env.example .env     # edit environment variables"
echo "  npm run dev              # start in development mode"
echo "  npm test                 # run tests"
echo ""
echo "Key files to customize:"
echo "  src/domain/entities/${ENTITY_NAME}.js          — domain entity"
echo "  src/domain/use-cases/${ENTITY_NAME}.use-case.js — business logic"
echo "  src/adapters/inbound/http/routes/${ENTITY_NAME}.routes.js — HTTP routes"
echo ""
