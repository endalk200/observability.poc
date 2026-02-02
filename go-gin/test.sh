echo "Creating user..."
curl -X POST http://localhost:8080/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}' | jq

# Store user id
user_id=$(curl http://localhost:8080/users | jq -r '.[0].id')

echo "User created!"

echo "Getting all users..."
curl http://localhost:8080/users | jq

echo "Getting user by ID..."
curl http://localhost:8080/users/$user_id | jq

echo "Updating user..."
curl -X PUT http://localhost:8080/users/$user_id \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Doe", "email": "jane@example.com"}' | jq

echo "Deleting user..."
curl -X DELETE http://localhost:8080/users/$user_id | jq
