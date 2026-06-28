# Quick Start Testing Guide

## ✅ Implementation Status

- ✅ All 7 form components created
- ✅ Integration complete
- ✅ Build successful (zero errors)
- ✅ Ready for testing

---

## 🚀 Step 1: Start the App

```bash
cd /home/man-gee/Documents/Angular/ComplexFormsJsonDriven/Project_Sample
ng serve
```

Then open: `http://localhost:4200`

---

## 🧪 Step 2: Test Each Form

### Open the Patient Capture Dialog
1. Click "Open Patient Capture" button
2. Dialog opens with form stepper

### Step-by-Step Testing

| Step | Form | What to Look For | ✓ Pass |
|------|------|------------------|--------|
| 1 | PersonalInfoForm | See 13 fields (name, DOB, gender, etc) | [ ] |
| 2 | ContactInfoForm | See 10 fields (phone, email, address, etc) | [ ] |
| 3 | MedicalHistoryForm | See 6 fields (conditions, allergies, etc) | [ ] |
| 4 | MedicationsForm | See 9 fields (medication, dosage, etc) | [ ] |
| 5 | LifestyleForm | See 9 fields (smoking, alcohol, etc) | [ ] |
| 6 | InsuranceForm | See 9 fields (medical aid, scheme, etc) | [ ] |
| 7 | EmergencyContactsForm | See 10 fields (emergency contacts, etc) | [ ] |

---

## 📋 Step 3: Check Console Logs

Open DevTools: Press `F12` → Go to "Console" tab

**Expected Logs:**
```
[FormGroupRegistry] Form: "patient_personal"
{
  detectedType: "personal",
  confidence: "85%",
  matchedFields: ["p_firstname", "p_lastname", ...],
  totalControls: 13
}

[FormGroupRegistry] Form: "patient_contact"
{
  detectedType: "contact",
  confidence: "80%",
  ...
}
... (one log per form)
```

- [ ] See 7 FormGroupRegistry logs
- [ ] Confidence scores show form types correctly identified
- [ ] No errors or warnings in console

---

## 🎯 Step 4: Test Key Features

### Test 1: Marital Status (PersonalInfoForm)
```
1. Go to Step 1 (PersonalInfoForm)
2. Scroll down to "Marital Status" radio buttons
3. Select "Married / Partnered"
   ✓ Partner tab should appear in tab bar
   ✓ Toast message should show: "Spouse / Partner tab enabled..."
   ✓ Can click Partner tab to see spouse fields
4. Select "Single"
   ✓ Partner tab should disappear
   ✓ Active tab switches back to Patient
```

- [ ] Marital status change works
- [ ] Partner tab appears/disappears correctly
- [ ] Toast message shows

### Test 2: Form Validation
```
1. Go to any form
2. Try to click "Next" without filling required fields
   ✓ Should see error messages on required fields
   ✓ Cannot proceed without filling them
3. Fill all required fields
   ✓ Can proceed to next step
```

- [ ] Validation works
- [ ] Error messages display
- [ ] Cannot submit invalid form

### Test 3: Responsive Design
```
1. Resize browser to mobile width (e.g., 375px)
   ✓ Form should stack in single column
   ✓ Buttons should be readable
   ✓ No horizontal scrolling
2. Resize back to desktop (1200px+)
   ✓ Form should show 2-column grid
   ✓ Full-width fields stay full-width
```

- [ ] Mobile layout works
- [ ] Desktop layout works
- [ ] Responsive breakpoints work

### Test 4: Combobox (When DB Ready)
```
Only works if backend endpoints are ready:
GET /api/options/combobox?field=...&q=...

In PersonalInfoForm:
1. Find "Nationality" field
2. Type "sa" or other characters
   ✓ Should show dropdown suggestions
   ✓ Should match typed text
   ✓ Should limit to 8 results
3. Click a result
   ✓ Field should populate
   ✓ Dropdown should close
```

- [ ] Combobox appears when typing
- [ ] Results filter correctly
- [ ] Selection works
- [ ] Field populates

### Test 5: Select Dropdowns
```
1. In any form, find a select field
2. Click dropdown
   ✓ Should show options
   ✓ Should be able to select
3. Select option
   ✓ Field should populate
   ✓ Form state updates
```

- [ ] Selects work
- [ ] Options display
- [ ] Selection works

---

## 🔍 Step 5: Verify No Errors

### Check Console for Errors
- [ ] No red errors in console
- [ ] No yellow warnings in console
- [ ] No network errors (404, 500, etc)

### Check Network Tab
1. Open DevTools → Network tab
2. Fill and submit form
3. Check that form data is collected properly
   - [ ] All fields have values
   - [ ] Structure is correct
   - [ ] No missing fields

---

## ✨ Step 6: Test Full Journey

```
1. Open Patient Capture dialog
2. Fill Step 1 (PersonalInfoForm)
   - Enter all required fields
   - Test marital status change
   - Go to next
3. Fill Step 2 (ContactInfoForm)
   - Enter address, phone, email
   - Go to next
4. Fill Step 3 (MedicalHistoryForm)
   - Select conditions/allergies
   - Go to next
5. Fill Step 4 (MedicationsForm)
   - Add medication info
   - Go to next
6. Fill Step 5 (LifestyleForm)
   - Select lifestyle options
   - Go to next
7. Fill Step 6 (InsuranceForm)
   - Medical aid info
   - Go to next
8. Fill Step 7 (EmergencyContactsForm)
   - Emergency contact info
9. Click "Submit"
   ✓ Should see success message
   ✓ Dialog should close
   ✓ Form data should be logged
```

- [ ] Can fill entire form without errors
- [ ] Can submit form successfully
- [ ] All data is preserved

---

## 📊 Test Report Template

```
TEST EXECUTION REPORT
Date: __________
Tester: __________

✓ PASSED TESTS:
- [ ] App builds without errors
- [ ] 7 forms display correctly
- [ ] Form detection logs appear
- [ ] Marital status toggles partner tab
- [ ] Validation works
- [ ] Responsive design works
- [ ] No console errors
- [ ] Full form journey works

⚠️ ISSUES FOUND:
1. ________________________________________
2. ________________________________________

📝 NOTES:
________________________________________
________________________________________

OVERALL: [ ] PASS [ ] FAIL [ ] NEEDS_FIXES
```

---

## 🐛 Troubleshooting

### Issue: Components don't appear
**Check:**
1. Browser console for errors
2. Network tab for failed requests
3. Verify all component imports in patient-capture-v2.ts
4. Rebuild: `ng build --configuration development`

### Issue: Form type shows "unknown"
**Check:**
1. Console logs - what type was detected?
2. FormGroupRegistry confidence score
3. Field names match patterns in registry

### Issue: Combobox doesn't search
**Check:**
1. Is backend endpoint ready? GET /api/options/combobox
2. Check network tab for request
3. Check response format (should be [{label, value}, ...])

### Issue: Select options don't load
**Check:**
1. Is backend endpoint ready? GET /api/options/category/{categoryId}
2. Check FormService method calls
3. Verify categoryId in form definition

---

## ✅ Sign-Off

When all tests pass:

```
Component Refactor: ✅ COMPLETE
Status: Production Ready
Date: __________
Tester: __________
```

---

## 📞 Next Steps

1. **If all tests pass:**
   - Commit changes
   - Create PR
   - Ready for merge

2. **If backend endpoints not ready:**
   - Still can test UI/layout
   - Implement endpoints later
   - Combobox will auto-work when ready

3. **If issues found:**
   - Check troubleshooting section
   - Review console logs
   - Check network requests
   - Contact development team

---

**Happy Testing!** 🎉
