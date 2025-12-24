# Adsterra Integration Setup Guide

This guide will help you integrate Adsterra ads into the Scriptorfi Editor to start earning revenue.

## Prerequisites

- A deployed version of Scriptorfi Editor (can be localhost for testing)
- A website/domain where the editor is hosted

## Step-by-Step Setup

### Step 1: Create an Adsterra Publisher Account

1. Visit [Adsterra Publisher Signup](https://adsterra.com/signup/publisher)
2. Fill in the registration form:
   - Email address
   - Password
   - Payment information (for receiving earnings)
3. Verify your email address
4. Complete your profile in the dashboard

### Step 2: Add Your Website

1. Log in to your Adsterra Publisher Dashboard
2. Navigate to "Websites" → "Add Website"
3. Enter your website details:
   - **URL**: Your application's URL (e.g., https://yourdomain.com)
   - **Category**: Choose "Services" or "Technology"
   - **Description**: Brief description of your transcription editor
4. Submit for review (usually approved within 24-48 hours)

### Step 3: Create Ad Units

Once your website is approved:

1. Go to "Ad Units" → "Create Ad Unit"
2. Create the following ad units:

#### Banner Ad (Top Placement)
- **Format**: Display Banner
- **Size**: 728x90 (Leaderboard) or Responsive
- **Name**: "Editor Top Banner"
- **Website**: Select your approved website
- Copy the generated **Ad Unit ID**

#### Banner Ad (Bottom Placement)
- **Format**: Display Banner
- **Size**: 728x90 (Leaderboard) or Responsive
- **Name**: "Editor Bottom Banner"
- **Website**: Select your approved website
- Copy the generated **Ad Unit ID**

#### Optional: Native Ad (Sidebar)
- **Format**: Native Banner
- **Size**: 300x250 (Medium Rectangle)
- **Name**: "Editor Sidebar Native"
- **Website**: Select your approved website
- Copy the generated **Ad Unit ID**

### Step 4: Configure Environment Variables

1. In your project root, copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and add your Adsterra Ad Unit IDs:
   ```env
   # Enable Adsterra ads
   REACT_APP_ADSTERRA_ENABLED=true

   # Add your Ad Unit IDs from Step 3
   REACT_APP_ADSTERRA_BANNER_TOP_ID=your_top_banner_id_here
   REACT_APP_ADSTERRA_BANNER_BOTTOM_ID=your_bottom_banner_id_here
   REACT_APP_ADSTERRA_NATIVE_ID=your_native_ad_id_here
   ```

3. Replace `your_top_banner_id_here` etc. with the actual Ad Unit IDs from Adsterra

### Step 5: Test Locally

1. Start your development server:
   ```bash
   npm start
   ```

2. Open http://localhost:3000 in your browser

3. Check that ad spaces are visible:
   - You should see placeholder divs for ads at the top and bottom
   - Ads may not display actual content in development (this is normal)

4. Open browser DevTools Console:
   - Look for any errors related to ad loading
   - Verify no JavaScript errors

### Step 6: Build and Deploy

1. Build the production version:
   ```bash
   npm run build
   ```

2. Deploy to your hosting platform:
   - **Vercel**: `vercel deploy`
   - **Netlify**: `netlify deploy --prod`
   - **GitHub Pages**: Follow GitHub Pages deployment guide
   - **Custom Server**: Upload the `build` folder

3. **Important**: Make sure environment variables are set in your hosting platform:
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Build & Deploy → Environment
   - Other platforms: Consult their documentation

### Step 7: Verify Ads in Production

1. Visit your deployed website
2. Ads should now display (may take a few minutes initially)
3. Check that:
   - Ads load without errors
   - Page layout isn't broken
   - Editor functionality still works
   - Ads are responsive on mobile

### Step 8: Monitor Performance

1. Log in to Adsterra Publisher Dashboard
2. Go to "Statistics" to monitor:
   - **Impressions**: Number of times ads were displayed
   - **Clicks**: Number of ad clicks
   - **CTR**: Click-through rate (clicks ÷ impressions)
   - **CPM**: Cost per thousand impressions
   - **Earnings**: Your revenue

3. Initial data may take 24-48 hours to appear

## Troubleshooting

### Ads Not Displaying

**Problem**: Ads don't show up on your website

**Solutions**:
- Verify `REACT_APP_ADSTERRA_ENABLED=true` in your environment
- Check that Ad Unit IDs are correct (no spaces or extra characters)
- Ensure your website is approved in Adsterra dashboard
- Clear browser cache and hard refresh (Ctrl+F5)
- Check browser console for JavaScript errors
- Disable ad blockers (they prevent ads from loading)

### Ads Break Layout

**Problem**: Ads cause layout issues or overlap with editor

**Solutions**:
- Adjust the `className` prop on `<AdsterraAd>` components
- Modify CSS in `App.js` to add margins/padding
- Test on different screen sizes
- Consider using smaller ad sizes

### Low CPM / Revenue

**Problem**: Earning very little per impression

**Solutions**:
- Target traffic from high-value countries (US, UK, Canada)
- Improve user engagement (longer sessions = more impressions)
- Test different ad placements
- Ensure ads are viewable (60%+ of ad must be visible)
- Drive high-quality traffic (organic > social > paid)

### Account Suspended

**Problem**: Adsterra suspended your account

**Solutions**:
- Review Adsterra's Publisher Policies
- Contact Adsterra support for clarification
- Never click your own ads
- Never encourage others to click ads
- Ensure content complies with policies

## Optimization Tips

### Maximize Revenue

1. **Placement**: Put ads where users naturally pause
2. **Quality Traffic**: Focus on organic and direct traffic
3. **Page Views**: Encourage users to explore multiple pages
4. **Session Duration**: Add valuable content to keep users engaged
5. **Mobile**: Ensure ads work well on mobile (50%+ of traffic)

### Balance User Experience

1. **Don't Overdo It**: Start with 2-3 ad placements
2. **Avoid Pop-ups**: They can annoy users (use sparingly)
3. **Page Speed**: Ensure ads don't slow down your app
4. **Relevant Ads**: Adsterra will show relevant ads based on content
5. **Test**: A/B test different placements to find optimal setup

### Scale Traffic

1. **SEO**: Optimize for search engines
2. **Social Media**: Share regularly on relevant platforms
3. **Content**: Create tutorials, blog posts, documentation
4. **Communities**: Engage in transcription communities
5. **Paid Ads**: Consider small ad campaigns to bootstrap growth

## Revenue Projections

Based on typical Adsterra CPM rates:

| Daily Visitors | Page Views | Daily Revenue | Monthly Revenue |
|---------------|------------|---------------|-----------------|
| 500           | 1,500      | $1.50 - $7.50 | $45 - $225      |
| 1,000         | 3,000      | $3 - $15      | $90 - $450      |
| 5,000         | 15,000     | $15 - $75     | $450 - $2,250   |
| 10,000        | 30,000     | $30 - $150    | $900 - $4,500   |

*Note: Actual earnings vary based on traffic geography, quality, and engagement*

## Payment Information

### Minimum Payout

- **Net 30/15**: Minimum $100
- **Paypal**: Minimum $100
- **Wire Transfer**: Minimum $1,000

### Payment Methods

1. PayPal
2. Wire Transfer
3. Paxum
4. WebMoney
5. Bitcoin (some regions)

### Payment Schedule

- Payments processed on NET-15 or NET-30 basis
- You can choose your preferred payment schedule
- Payment threshold must be met

## Compliance Checklist

Before going live, ensure:

- [ ] Privacy Policy mentions use of third-party advertising
- [ ] Cookie consent implemented (required for EU)
- [ ] Terms of Service updated to mention ads
- [ ] Content complies with Adsterra policies
- [ ] No prohibited content (illegal, adult, violence, etc.)
- [ ] No ad click manipulation
- [ ] No misleading content near ads

## Support

### Adsterra Support

- **Email**: publishers@adsterra.com
- **Help Center**: https://adsterra.com/publishers-help-center/
- **Telegram**: Official Adsterra publisher groups
- **Response Time**: Usually 24-48 hours

### Common Questions

**Q: How long until I see revenue?**
A: Stats appear within 24-48 hours; first payment after reaching minimum threshold.

**Q: Can I use other ad networks alongside Adsterra?**
A: Yes, but avoid placing multiple ads in the same location (can lower CPM).

**Q: Will ads slow down my website?**
A: Minimal impact if implemented correctly (ads load asynchronously).

**Q: What if users complain about ads?**
A: Consider offering a premium ad-free version or reduce ad density.

**Q: Can I use this on a subdomain?**
A: Yes, but you'll need to add the subdomain to your Adsterra account.

## Next Steps

After successful integration:

1. **Week 1**: Monitor daily, ensure no issues
2. **Week 2-4**: Optimize placements based on data
3. **Month 2**: Experiment with additional ad formats
4. **Month 3+**: Scale traffic, explore premium features

## Additional Resources

- [MONETIZATION.md](./MONETIZATION.md) - Complete 10-day strategy
- [Adsterra Publisher Policies](https://adsterra.com/publishers-terms/)
- [Ad Format Comparison](https://adsterra.com/ad-formats/)

---

**Remember**: Successful monetization requires patience, optimization, and consistent traffic growth. Don't expect huge revenue immediately—focus on building your user base while optimizing ad performance.
