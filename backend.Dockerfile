FROM golang:1.24-alpine AS builder
RUN apk add --no-cache gcc musl-dev
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
RUN CGO_ENABLED=1 GOOS=linux go build -o /nazareth-server ./cmd/server/

FROM alpine:3.19
RUN apk add --no-cache ca-certificates musl
COPY --from=builder /nazareth-server /usr/local/bin/nazareth-server
EXPOSE 8080
CMD ["nazareth-server"]
