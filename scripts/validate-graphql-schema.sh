#!/usr/bin/env sh

# Run graphql-codegen and capture its exit status
# npx graphql-codegen --check
grep -Ev '^\\s*@' schema.graphql > schema.no-directives.graphql && npx graphql-codegen --config codegen.yml --check && rm schema.no-directives.graphql
CODEGEN_STATUS=$?

# Check if the command failed (non-zero exit status)
if [ $CODEGEN_STATUS -ne 0 ]; then
  echo "Error: Generated code is out of sync with the schema."
  echo "Please run 'npx graphql-codegen' and commit the changes."
  exit 1
fi
