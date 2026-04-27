FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o /nazareth-server ./cmd/server/

FROM alpine:3.19
RUN apk add --no-cache ca-certificates
COPY --from=builder /nazareth-server /usr/local/bin/nazareth-server
EXPOSE 8080
CMD ["nazareth-server"]
