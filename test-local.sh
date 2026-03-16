#!/bin/bash

# Test all skills locally
# Usage: ./test-local.sh
# Make sure to run `npm run dev` first and set SKILL_AUTH_TOKEN in .env

BASE_URL="${BASE_URL:-http://localhost:3000}"
AUTH_TOKEN="${SKILL_AUTH_TOKEN:-your_secret_token_here}"

echo "🧪 Testing Claw0x Skills"
echo "========================"
echo ""

test_skill() {
  local name=$1
  local endpoint=$2
  local payload=$3
  echo "→ $name ($endpoint)"
  curl -s -X POST "$BASE_URL$endpoint" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$payload" | jq '.' 2>/dev/null || echo "(install jq for pretty output)"
  echo ""
}

test_skill "Sentiment Analyzer" "/api/sentiment" '{"text": "I love this product!"}'
test_skill "Email Validator" "/api/validate-email" '{"email": "test@example.com"}'
test_skill "Web Scraper" "/api/scrape" '{"url": "https://example.com"}'
test_skill "Translation" "/api/translate" '{"text": "hello", "target_lang": "es"}'
test_skill "Image Generator" "/api/generate-image" '{"prompt": "A sunset over mountains"}'
test_skill "PDF Parser" "/api/parse-pdf" '{"pdf_url": "https://example.com/test.pdf"}'

echo "✅ Done"
