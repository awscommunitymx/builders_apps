#!/usr/bin/env sh

# Check for changes in GraphQL schema files
SCHEMA_CHANGES=$(git diff --cached --name-only -- '*.graphql' '*.gql')

if [ -n "$SCHEMA_CHANGES" ]; then
  echo "GraphQL schema changes detected. Checking if generated code is up-to-date..."

  # Stash any unstaged changes to avoid interference
  git stash push --keep-index --quiet

  # Run the codegen tool to see if the generated code would change
  npx graphql-codegen --check

  # Capture the output of the dry-run
  CODE_GEN_OUTPUT=$(npx graphql-codegen --check 2>&1)

  # Unstash the changes
  git stash pop --quiet

  # Check if the dry-run output indicates changes
  if echo "$CODE_GEN_OUTPUT" | grep -q "Changes detected"; then
    echo "Error: Generated code is out of sync with the schema."
    echo "Please run 'npx graphql-codegen' and commit the changes."
    exit 1
  else
    echo "Generated code is up-to-date. Proceeding with the commit."
  fi
fi
