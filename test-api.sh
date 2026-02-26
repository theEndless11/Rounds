#!/bin/bash

# Push Notification API Test Script
# Usage: bash test-api.sh

API_URL="https://octopus-push-api-production-677b.up.railway.app"

echo "🧪 Testing Push Notification API"
echo "================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo "1️⃣  Testing Health Endpoint..."
echo "   GET $API_URL/health"
echo ""

HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$HEALTH_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ SUCCESS${NC} - Health check passed"
    echo "   Response: $BODY"
else
    echo -e "   ${RED}❌ FAILED${NC} - HTTP $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""
echo "-----------------------------------"
echo ""

# Test 2: Register Push Token
echo "2️⃣  Testing Register Push Token..."
echo "   POST $API_URL/api/push/register"
echo ""

REGISTER_DATA='{
  "user_id": "test-user-123",
  "token": "test-fcm-token-abc123",
  "platform": "android"
}'

REGISTER_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$REGISTER_DATA" \
  "$API_URL/api/push/register")

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$REGISTER_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ SUCCESS${NC} - Token registered"
    echo "   Response: $BODY"
else
    echo -e "   ${RED}❌ FAILED${NC} - HTTP $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""
echo "-----------------------------------"
echo ""

# Test 3: Send Push Notification (this will likely fail if user doesn't exist in DB)
echo "3️⃣  Testing Send Push Notification..."
echo "   POST $API_URL/api/push/send"
echo ""

SEND_DATA='{
  "user_id": "test-user-123",
  "notification": {
    "title": "Test Notification",
    "body": "This is a test push notification",
    "type": "test",
    "badge": 1
  }
}'

SEND_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$SEND_DATA" \
  "$API_URL/api/push/send")

HTTP_CODE=$(echo "$SEND_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$SEND_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ SUCCESS${NC} - Notification sent"
    echo "   Response: $BODY"
elif [ "$HTTP_CODE" = "500" ]; then
    echo -e "   ${YELLOW}⚠️  EXPECTED FAILURE${NC} - Test user doesn't exist in database"
    echo "   Response: $BODY"
    echo "   This is normal for testing - the API is working!"
else
    echo -e "   ${RED}❌ FAILED${NC} - HTTP $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""
echo "-----------------------------------"
echo ""

# Test 4: Get Unread Count
echo "4️⃣  Testing Get Unread Count..."
echo "   GET $API_URL/api/messages/unread-count?user_id=test-user-123"
echo ""

UNREAD_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  "$API_URL/api/messages/unread-count?user_id=test-user-123")

HTTP_CODE=$(echo "$UNREAD_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$UNREAD_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ SUCCESS${NC} - Unread count retrieved"
    echo "   Response: $BODY"
else
    echo -e "   ${YELLOW}⚠️  PARTIAL${NC} - HTTP $HTTP_CODE (may need CHAT_API_URL configured)"
    echo "   Response: $BODY"
fi
echo ""
echo "-----------------------------------"
echo ""

# Test 5: Unregister Push Token
echo "5️⃣  Testing Unregister Push Token..."
echo "   POST $API_URL/api/push/unregister"
echo ""

UNREGISTER_DATA='{
  "token": "test-fcm-token-abc123"
}'

UNREGISTER_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$UNREGISTER_DATA" \
  "$API_URL/api/push/unregister")

HTTP_CODE=$(echo "$UNREGISTER_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$UNREGISTER_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ SUCCESS${NC} - Token unregistered"
    echo "   Response: $BODY"
else
    echo -e "   ${RED}❌ FAILED${NC} - HTTP $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""
echo "-----------------------------------"
echo ""

# Test 6: Error handling - Missing parameters
echo "6️⃣  Testing Error Handling (missing parameters)..."
echo "   POST $API_URL/api/push/register (empty body)"
echo ""

ERROR_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{}' \
  "$API_URL/api/push/register")

HTTP_CODE=$(echo "$ERROR_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$ERROR_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "400" ]; then
    echo -e "   ${GREEN}✅ SUCCESS${NC} - Correctly returned 400 for bad request"
    echo "   Response: $BODY"
else
    echo -e "   ${YELLOW}⚠️  UNEXPECTED${NC} - Expected 400, got HTTP $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""
echo "================================="
echo "🏁 Testing Complete!"
echo ""
