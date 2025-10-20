# Re-Engagement Email Campaign Guide

## 📧 Overview

You have **100 inactive users** who signed up but never used the platform. This campaign will:
- Send them a professional re-engagement email
- Award 50 bonus credits automatically
- Tease the upcoming Etsy integration
- Track results and conversions

---

## 🎯 Campaign Strategy

### **Send NOW (Don't Wait for Etsy Integration)**

**Why send now:**
- ✅ Re-engage before they forget you
- ✅ Show momentum and improvements
- ✅ Get valuable feedback on why they didn't use it
- ✅ Build anticipation for Etsy integration
- ✅ Early adopter advantage

**Why NOT wait:**
- ❌ They'll forget about you completely
- ❌ Email deliverability drops (stale lists)
- ❌ Competitors might capture them
- ❌ Lose chance to fix initial problems

---

## 📝 Email Content

### **Subject Line:**
"We listened: Major upgrades to Art Studio Pro 🎨"

### **Key Messages:**
1. **Acknowledge** - "We noticed you haven't tried it yet"
2. **Empathize** - "The first version wasn't perfect"
3. **Show Progress** - List all new features
4. **Tease Future** - "Etsy integration coming soon"
5. **Reward** - "50 bonus credits just for logging back in"
6. **Call to Action** - Clear button to try it now

### **Incentives:**
- 50 bonus credits (awarded automatically)
- Early access to Etsy integration
- Priority support

---

## 🚀 How to Run the Campaign

### **Step 1: Test First (Dry Run)**

Preview what will happen without sending emails:

```bash
npm run send-reengagement -- --dry-run
```

This shows:
- How many users will be contacted
- Their email addresses and last login dates
- No emails sent, no credits awarded

### **Step 2: Test with Limited Users**

Send to just 5 users first to test:

```bash
npm run send-reengagement -- --limit=5
```

Wait 5 seconds, then emails will send to first 5 users.

### **Step 3: Send to Everyone**

Once you're confident:

```bash
npm run send-reengagement
```

Wait 5 seconds, then all inactive users will receive emails.

---

## 📊 What Happens

### **For Each User:**
1. ✅ Email sent via SendGrid
2. ✅ 50 credits added to their account
3. ✅ `updated_at` timestamp updated
4. ✅ Console logs success/failure

### **Rate Limiting:**
- 100ms delay between emails
- Prevents SendGrid rate limits
- ~100 users = ~10 seconds total

---

## 🎁 Bonus Credits System

### **How It Works:**
```sql
-- Automatically adds 50 credits when email is sent successfully
UPDATE users 
SET credits = credits + 50,
    updated_at = NOW()
WHERE id = [user_id];
```

### **When Credits Are Awarded:**
- ✅ Only if email sends successfully
- ✅ Immediately after email confirmation
- ✅ No action needed from user
- ✅ Credits ready when they log in

---

## 📈 Tracking Results

### **Monitor These Metrics:**

**Week 1:**
- Email open rate (check SendGrid dashboard)
- Login rate (check database)
- Credit usage (how many actually use the credits)

**Week 2:**
- Conversion to paid plans
- Feature usage patterns
- Support questions/feedback

### **SQL Queries to Track:**

```sql
-- Check how many logged in after campaign
SELECT COUNT(*) as logged_in_users
FROM users
WHERE last_login > '2025-10-19'  -- Campaign date
  AND (last_login IS NULL OR last_login < DATE_SUB('2025-10-19', INTERVAL 30 DAY));

-- Check credit usage
SELECT 
  COUNT(*) as users_who_used_credits,
  SUM(50 - credits) as total_credits_used
FROM users
WHERE credits < 50
  AND updated_at > '2025-10-19';  -- Campaign date
```

---

## 🔄 Follow-Up Campaign (2 Weeks Later)

### **Campaign 2: "Etsy Integration is Live!"**

Send when Etsy API is approved:

**Subject:** "🎉 Etsy Integration is LIVE - Publish listings in seconds"

**Content:**
- Announce Etsy integration launch
- Show quick demo/screenshot
- Highlight success stories (if any)
- Offer onboarding call
- Limited-time offer for Pro plan

---

## ⚠️ Important Notes

### **Email Compliance:**
- ✅ Unsubscribe link included (links to /settings)
- ✅ SendGrid handles bounce/spam management
- ✅ Only sending to users who signed up (opted in)
- ✅ Clear sender identity

### **SendGrid Setup:**
Make sure these are configured in `.env`:
```bash
SENDGRID_API_KEY=SG.your_key_here
CONTACT_FROM_EMAIL=info@imageupscaler.app
```

### **Database Backup:**
Before running campaign:
```bash
# Backup your database (just in case)
pg_dump your_database > backup_before_campaign.sql
```

---

## 🎯 Expected Results

### **Realistic Expectations:**

**Email Metrics:**
- Open rate: 20-30% (20-30 users)
- Click rate: 5-10% (5-10 users)
- Login rate: 3-5% (3-5 users)

**Conversion:**
- 1-2 users convert to paid plans
- 3-5 users actively use free credits
- 5-10 users provide valuable feedback

### **Success Criteria:**
- ✅ 5+ users log back in
- ✅ 2+ users use credits
- ✅ 1+ user converts to paid
- ✅ Valuable feedback on why they didn't use it initially

---

## 📞 Support Preparation

### **Expect Questions About:**
1. "How do I use my bonus credits?"
2. "When is Etsy integration coming?"
3. "Can I get more credits?"
4. "How does [feature] work?"

### **Prepare Responses:**
- Quick start guide
- Video tutorials
- FAQ page
- Personal onboarding offer

---

## 🚀 Action Plan

### **This Week:**
- [ ] Review email content (already done!)
- [ ] Test with dry run: `npm run send-reengagement -- --dry-run`
- [ ] Test with 5 users: `npm run send-reengagement -- --limit=5`
- [ ] Monitor results for 24 hours
- [ ] Send to all users: `npm run send-reengagement`

### **Next Week:**
- [ ] Monitor login rates
- [ ] Respond to questions/feedback
- [ ] Track credit usage
- [ ] Prepare follow-up campaign

### **Week 3 (After Etsy Approval):**
- [ ] Send "Etsy Integration Live" email
- [ ] Offer onboarding calls
- [ ] Share success stories
- [ ] Convert to paid plans

---

## 💡 Pro Tips

1. **Send on Tuesday-Thursday** - Best email open rates
2. **Send 10am-2pm** - When people check email
3. **Respond quickly** - Reply to questions within 24 hours
4. **Personal touch** - Consider personal follow-up for engaged users
5. **Learn from feedback** - Use insights to improve product

---

## 📊 Campaign Dashboard

Track in Google Sheets or similar:

| Metric | Target | Actual | Notes |
|--------|--------|--------|-------|
| Emails sent | 100 | - | |
| Open rate | 25% | - | |
| Click rate | 8% | - | |
| Logins | 5 | - | |
| Credits used | 3 | - | |
| Paid conversions | 1 | - | |

---

## ✅ Ready to Launch!

Everything is set up and ready to go. Just run:

```bash
# Test first
npm run send-reengagement -- --dry-run

# Then send for real
npm run send-reengagement
```

**Good luck with your campaign!** 🎉
