# Sequential Version Testing Plan

## Testing Strategy
Test each version systematically, working backwards from current, to identify the best working version.

## Versions to Test (in order)
1. **v3.7.0** (ba8677e) - Current - "Enhanced Debug Rebuild" - KNOWN BROKEN
2. **v3.6.0** (cb38efc) - "Production ready with SQL validation, Partner Opportunity Intelligence page fully restored"
3. **v3.4.0** (4d2a6cd) - "Debug logic, prompt management, documentation updates complete"
4. **v3.3.0** (bec5a82) - "Enterprise Infrastructure & Multi-Environment Support"
5. **v3.2.0** (defe992) - "User-driven truncation/settings, centralized model config"
6. **v3.1.0** (dcf89a1) - "Lambda Timeout Fix & Enhanced Performance - Production Ready"

## Testing Commands for Each Version

### Safe Testing Process
```bash
# 1. Create backup branch of current work
git branch backup-current-work HEAD

# 2. Test each version with these commands:
git checkout [COMMIT_HASH]
npm start &
# Test in browser, document results
# Kill server: pkill -f "node app.js"

# 3. Return to main when done testing
git checkout main
```

## Testing Checklist for Each Version

### Core Functionality Tests
- [ ] Application starts without errors (`npm start`)
- [ ] Page loads in browser (http://localhost:3000)
- [ ] Main interface displays correctly
- [ ] Form fields are present and functional
- [ ] "Analyze Opportunity" button works
- [ ] Results display properly
- [ ] No console errors in browser dev tools

### Interface Quality Tests
- [ ] Professional appearance
- [ ] All UI components render correctly
- [ ] Responsive design works
- [ ] Navigation/tabs functional
- [ ] Settings/configuration accessible
- [ ] Export functionality available

### Functional Feature Tests
- [ ] Can input customer/opportunity data
- [ ] Analysis generates results
- [ ] Debug information accessible
- [ ] Error handling works properly
- [ ] Theme switching works
- [ ] All buttons/controls functional

## Testing Results Template

### Version: [VERSION] ([COMMIT])
**Date Tested**: [DATE]
**Status**: ✅ WORKING / ⚠️ PARTIAL / ❌ BROKEN

**Interface Quality**: [RATING 1-5]
**Functionality**: [RATING 1-5]
**User Experience**: [RATING 1-5]

**Key Features Working**:
- [ ] Main analysis functionality
- [ ] Professional interface
- [ ] Settings system
- [ ] Export capabilities
- [ ] Debug features

**Issues Found**:
- [List any problems]

**Overall Assessment**: [SUMMARY]

---

## Quick Testing Script

Save this as `test-version.sh`:
```bash
#!/bin/bash
VERSION=$1
COMMIT=$2

echo "Testing version $VERSION ($COMMIT)"
git checkout $COMMIT
echo "Starting server..."
npm start &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
echo "Visit http://localhost:3000 to test"
echo "Press Enter when testing complete..."
read
kill $SERVER_PID
git checkout main
echo "Test complete for $VERSION"
```

Usage: `./test-version.sh v3.6.0 cb38efc`