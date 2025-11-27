#!/bin/bash

echo "Testing authentication flow..."

# Login with admin credentials and get the token
echo "Logging in with admin credentials..."
RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@footpath.com",
    "password": "admin123"
  }')

echo "Login response:"
echo $RESPONSE
echo

# Extract the token from the response
TOKEN=$(echo $RESPONSE | jq -r '.token')
USER_ID=$(echo $RESPONSE | jq -r '.user.id')

if [ "$TOKEN" != "null" ] && [ "$TOKEN" != "" ]; then
    echo "Token retrieved successfully: ${TOKEN:0:20}..."
    
    # Test the protected /auth/me endpoint
    echo "Testing /auth/me endpoint with token..."
    ME_RESPONSE=$(curl -s -X GET http://localhost:3000/auth/me \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json")
    
    echo "Response from /auth/me:"
    echo $ME_RESPONSE
    echo
    
    # Check if the response contains user data
    if echo $ME_RESPONSE | jq -e .email >/dev/null 2>&1; then
        echo "✅ SUCCESS: Authentication is working! Got user data from /auth/me"
        echo "User email: $(echo $ME_RESPONSE | jq -r '.email')"
        echo "User ID: $(echo $ME_RESPONSE | jq -r '.id')"
        echo "User role: $(echo $ME_RESPONSE | jq -r '.role')"
    else
        echo "❌ FAILED: /auth/me returned error or invalid response"
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:3000/auth/me \
          -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/json")
        echo "HTTP Status Code: $HTTP_CODE"
    fi
else
    echo "❌ FAILED: Could not retrieve token from login response"
    echo "Response: $RESPONSE"
fi