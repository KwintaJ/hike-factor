FROM golang:1.26-alpine

RUN apk add --no-cache git ca-certificates

WORKDIR /app

COPY go.mod go.sum ./

ENV GOPROXY=https://proxy.golang.org,direct

RUN go mod download

COPY . .

RUN go build -o main cmd/api/main.go

EXPOSE 8080

CMD ["./main"]