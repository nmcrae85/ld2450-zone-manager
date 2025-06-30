ARG BUILD_FROM
FROM $BUILD_FROM

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install requirements for add-on
RUN \
  apk add --no-cache \
    python3 \
    py3-pip

# Copy data for add-on
COPY . /app
WORKDIR /app

# Make sure we use the latest pip and setuptools
RUN pip3 install --upgrade pip setuptools

# Start application
CMD ["python3", "-m", "http.server", "8080"]