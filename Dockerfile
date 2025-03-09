FROM mcr.microsoft.com/devcontainers/javascript-node:${NODE_VERSION}

# Install additional OS packages
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    jq \
    less \
    vim \
    curl \
    git-lfs \
    zip \
    unzip \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/* \
    && curl -sL https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o awscliv2.zip \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf aws awscliv2.zip

# Install AWS CDK CLI
RUN npm install -g aws-cdk typescript ts-node

# Setup bash history and command completion
RUN echo 'source /usr/share/bash-completion/completions/git' >> /home/node/.bashrc \
    && echo 'complete -C aws_completer aws' >> /home/node/.bashrc \
    && echo 'export CDK_DEFAULT_REGION=${AWS_REGION:-us-east-1}' >> /home/node/.bashrc

# Add scripts directory to store helpful developer scripts
RUN mkdir -p /home/node/scripts

# Create a useful CDK helper script
RUN echo '#!/bin/bash\n\
ENV=$1\n\
shift\n\
npx cdk "$@" --context env=${ENV:-dev}\n\
' > /home/node/scripts/cdk-env.sh \
    && chmod +x /home/node/scripts/cdk-env.sh

# Setup PATH to include scripts directory
RUN echo 'export PATH=$PATH:/home/node/scripts' >> /home/node/.bashrc

# Change ownership
RUN chown -R node:node /home/node