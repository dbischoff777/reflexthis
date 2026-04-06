# Game Publishing Guide for Reflex This

## Overview

Reflex This is a React/Next.js web-based game with Electron support, making it suitable for desktop distribution platforms. This guide covers publishing options, requirements, and best practices.

---

## 🎮 Major Distribution Platforms

### 1. **Steam** (Recommended for Indie Games)

#### Why Steam?
- Largest PC gaming platform (~120M+ monthly active users)
- Built-in achievements, cloud saves, workshop support
- Automatic updates via Steamworks SDK
- Regional pricing and global distribution
- Community features (forums, reviews, guides)
- Steam Deck compatibility potential

#### Requirements
- **Steam Direct Fee**: $100 per game (one-time, recoupable after $1,000 in sales)
- **Tax Information**: W-8/W-9 forms required
- **Business Entity**: Not required but recommended
- **Age Rating**: Optional but helpful for visibility
- **Revenue Split**: Steam takes 30% (20% after $10M, 25% after $50M)

#### Technical Requirements for Electron Games
- **Supported OS**: Windows (7+), macOS (10.13+), Linux (Ubuntu 18.04+)
- **Minimum Specs**: Document what your game needs
  - For Reflex This: Modern browser with WebGL 2.0, 2GB RAM, 500MB storage
- **DRM**: Steamworks DRM optional (can run without Steam client)
- **Achievements**: Integrate Greenworks (Steamworks Node.js wrapper)
- **Cloud Saves**: Store progress in Steam Cloud

#### Publishing Process
1. **Register as Steamworks Partner**
   - Visit [partner.steamgames.com](https://partner.steamgames.com)
   - Pay $100 Steam Direct fee
   - Complete tax forms and banking information
   - Wait for account verification (~3-5 days)

2. **Create App ID**
   - Set up your game in Steamworks
   - Configure store page (name, description, screenshots, videos)
   - Set pricing and regional options
   - Add system requirements

3. **Integrate Steamworks SDK**
   ```bash
   npm install greenworks --save
   # or
   npm install steamworks.js --save
   ```
   
   **Key Features to Integrate:**
   - Steam Overlay
   - Achievements
   - Leaderboards
   - Cloud Saves
   - Rich Presence (show game state in Steam)

4. **Build & Upload**
   ```bash
   # Build for all platforms
   npm run electron:build:win
   npm run electron:build:mac
   npm run electron:build:linux
   
   # Use Steamworks SDK Content Builder to upload builds
   # Located in: steamworks_sdk/tools/ContentBuilder/
   ```

5. **Testing**
   - Use Steam's testing branches
   - Invite beta testers
   - Test on Steam Deck if applicable

6. **Release**
   - Complete store page
   - Submit for review (automated, usually instant)
   - Set release date or launch immediately
   - Marketing materials ready

#### Best Practices for Steam
- **Regular Updates**: Steam users expect active development
- **Community Engagement**: Respond to forum posts and reviews
- **Achievements**: Add meaningful achievements (not just story progress)
- **Trading Cards**: Requires at least 10 achievements and $1,000 in sales
- **Workshop Support**: Consider if user-generated content makes sense
- **Controller Support**: Implement gamepad controls (important for Steam Deck)
- **Multiple Languages**: Support more languages for wider reach
- **Demo Version**: Free demos increase conversion by ~10-15%

#### Monetization Options on Steam
- **Base Game**: One-time purchase ($0.99 - $59.99 typical range)
- **DLC**: Additional content packs
- **In-Game Purchases**: Cosmetics, levels (requires Steamworks Microtransactions)
- **Free-to-Play**: Supported, but requires business model planning

---

### 2. **GOG (Good Old Games)**

#### Why GOG?
- DRM-free philosophy attracts specific audience
- Curated store (hand-picked games)
- Better revenue split potential for indie devs
- Strong European presence
- No mandatory client (games run standalone)
- Galaxy client optional but recommended

#### Requirements
- **No Direct Fee**: Free to publish (but harder to get accepted)
- **Curation Process**: Manual review by GOG team
- **DRM-Free**: **CRITICAL** - Must work completely offline without client
- **Revenue Split**: Typically 30% (negotiable for larger titles)
- **Quality Bar**: Higher than Steam - focus on polish

#### Why GOG Might Be Challenging for Web-Based Games
- GOG prefers native applications
- DRM-free requirement means no server-side features
- Electron games are acceptable but must be well-optimized
- Smaller user base (~5-10M active users)

#### Publishing Process
1. **Submit Your Game**
   - Visit [gogdb.org/game_submissions](https://www.gog.com/indie)
   - Fill out submission form
   - Provide build, press kit, gameplay footage
   - Wait for review (can take 1-6 months)

2. **Manual Review**
   - GOG team reviews gameplay, polish, marketability
   - Rejection is common - don't be discouraged
   - Feedback may or may not be provided

3. **If Accepted**
   - Work with GOG product manager
   - Integrate GOG Galaxy SDK (optional but recommended)
   - Prepare offline installer
   - Set up store page

4. **Build Requirements**
   - Standalone installers (no Steam dependencies)
   - Offline functionality
   - Clean uninstall process

#### Best Practices for GOG
- **Polish First**: Only submit when game is feature-complete
- **Retro Appeal**: GOG audience loves classic gameplay
- **No Always-Online**: Everything must work offline
- **Fair Pricing**: GOG users value DRM-free, price accordingly
- **Regular Updates**: Show continued support

---

### 3. **Epic Games Store**

#### Why Epic?
- 88/12 revenue split (you keep 88%)
- Exclusive deals with upfront guarantees
- Free games program provides massive exposure
- Unreal Engine games get extra benefits
- Growing user base (~68M+ monthly users)

#### Requirements
- **No Direct Fee**: Free to publish
- **Curation Process**: Manual review required
- **EOS Integration**: Epic Online Services recommended
- **Revenue Split**: 12% (best in the industry)

#### Publishing Process
1. **Apply via Epic Games Publishing**
   - Visit [dev.epicgames.com/en-US/services](https://dev.epicgames.com)
   - Submit game details and build
   - Wait for review (varies widely)

2. **Integration**
   - Epic Online Services (EOS) for achievements, friends, etc.
   - EOS SDK available for C++, C#, Java (Electron requires wrapper)

3. **Release**
   - Work with Epic account manager
   - Coordinate marketing (if accepted for promotion)

#### Best Practices for Epic
- **Consider Exclusivity**: Epic may offer guaranteed revenue for timed exclusive
- **EOS Features**: Implement crossplay if applicable
- **Free Game Consideration**: Huge player boost but plan for monetization

---

### 4. **Itch.io** (Best Starting Point)

#### Why Itch.io?
- **Easiest to publish**: No approval process
- **Flexible pricing**: Pay-what-you-want, free, paid
- **Creator-friendly**: Keep 90-100% of revenue (you set the split)
- **Indie community**: Supportive audience
- **No fees**: $0 to start
- **Web games supported**: Can publish browser version directly

#### Requirements
- Account (free)
- Game build (Windows/Mac/Linux or HTML5)
- Basic store page

#### Publishing Process
1. **Create Account**: Visit [itch.io](https://itch.io)
2. **Upload Build**: 
   ```bash
   # Zip your Electron builds
   # Or export HTML5 build from Next.js
   npm run build
   # Upload .next/standalone + .next/static + public
   ```
3. **Configure Page**: Title, description, screenshots, pricing
4. **Publish**: Instant, no approval

#### Best Practices for Itch.io
- **Use as Testing Ground**: Launch here first to gather feedback
- **Community Engagement**: Participate in game jams, bundles
- **Devlogs**: Regular updates build audience
- **Pricing Strategy**: PWYW can generate more downloads
- **HTML5 Version**: Browser playable increases discoverability

---

### 5. **Microsoft Store**

#### Why Microsoft Store?
- Xbox Game Pass potential
- Windows 11 default store
- Xbox console distribution possible
- Cross-buy with Xbox

#### Requirements
- **Developer Account**: $19 one-time fee
- **UWP or Desktop Bridge**: Convert Electron app
- **Age Rating**: IARC rating required (free)
- **Revenue Split**: 12% for PC games (88% to developer)

#### Publishing Process
1. **Register**: [Microsoft Partner Center](https://partner.microsoft.com)
2. **Desktop Bridge**: Convert Electron app to APPX
   ```bash
   # Use electron-windows-store
   npm install -g electron-windows-store
   electron-windows-store --input-directory ./dist --output-directory ./appx
   ```
3. **Submit for Certification**: 1-3 days review
4. **Publish**: Available in Microsoft Store

---

### 6. **Mac App Store**

#### Why Mac App Store?
- Reach Mac users directly
- Trusted distribution
- Apple Silicon native support

#### Requirements
- **Apple Developer Account**: $99/year
- **App Sandbox**: Strict security requirements
- **Code Signing**: Required for notarization
- **Revenue Split**: 30% (15% after year 1 subscription)

#### Challenges for Electron Apps
- Sandboxing can break some Node.js features
- Notarization process can be complex
- Review process strict

---

## 🚀 Alternative Distribution Methods

### 1. **Self-Distribution**
**Pros:**
- Keep 100% revenue
- Full control over updates
- Direct customer relationship

**Cons:**
- No discoverability
- Payment processing fees (Stripe ~2.9%)
- Customer support burden
- No refund system

**Tools:**
- [Gumroad](https://gumroad.com): 10% fee, easy setup
- [Itch.io Direct Sales](https://itch.io): Pay-what-you-want split
- [Payhip](https://payhip.com): 5% fee
- Your own website with Stripe/PayPal

### 2. **Game Bundles**
- **Humble Bundle**: Exposure to millions, but low revenue per unit
- **Fanatical**: Similar to Humble
- **Itch.io Bundles**: Community-driven

### 3. **Web Distribution**
Since Reflex This is built with Next.js, you can also distribute it as:
- **Browser Game**: Host on Vercel, Netlify, or your own domain
- **Freemium Model**: Free web version, paid desktop features
- **Subscription**: Monthly/yearly access via Stripe
- **Ads**: Integrate Google AdSense or similar

---

## 📋 Publishing Checklist for Reflex This

### Pre-Launch Tasks

#### 1. **Game Polish**
- [ ] All game modes working and balanced
- [ ] No critical bugs
- [ ] Performance optimized (60fps on minimum specs)
- [ ] Audio levels balanced
- [ ] UI/UX polished and consistent
- [ ] Tutorial/first-time experience smooth
- [ ] Achievement system fully implemented
- [ ] Leaderboards working (if applicable)

#### 2. **Content Requirements**
- [ ] **Screenshots**: 5-10 high-quality (1920x1080 or higher)
- [ ] **Trailer**: 30-90 seconds gameplay video
- [ ] **Icon**: 512x512 minimum, transparent background
- [ ] **Banner**: 1920x1080 for store headers
- [ ] **Description**: 500-1000 words, compelling copy
- [ ] **Feature List**: Key selling points
- [ ] **System Requirements**: Min and recommended specs
- [ ] **Age Rating**: ESRB, PEGI, or IARC

#### 3. **Technical Requirements**
- [ ] **Build for all platforms**: Windows, Mac, Linux
  ```bash
  npm run electron:build:win
  npm run electron:build:mac
  npm run electron:build:linux
  ```
- [ ] **Code signing**: Sign Windows/Mac builds
- [ ] **Auto-updater**: Implement with electron-updater
- [ ] **Crash reporting**: Integrate Sentry or similar
- [ ] **Analytics**: Track user engagement (respect privacy)
- [ ] **Localization**: Support multiple languages
- [ ] **Accessibility**: Color blind mode, controller support

#### 4. **Legal Requirements**
- [ ] **Privacy Policy**: Required if collecting data
- [ ] **Terms of Service**: Recommended
- [ ] **EULA**: End User License Agreement
- [ ] **Copyright/Trademark**: Protect your game name/logo
- [ ] **Music/Asset Licensing**: Ensure you own or licensed all assets
- [ ] **GDPR Compliance**: If selling in EU

#### 5. **Marketing Preparation**
- [ ] **Press Kit**: Logo, screenshots, trailer, fact sheet
- [ ] **Social Media**: Twitter, Discord, Reddit presence
- [ ] **Website**: Landing page with sign-up for launch
- [ ] **Demo Version**: Optional but highly recommended
- [ ] **Content Creator Keys**: For YouTube/Twitch streamers
- [ ] **Launch Discount**: 10-20% off for first week

---

## 🎯 Recommended Publishing Strategy for Reflex This

### Phase 1: Soft Launch (Month 1-2)
1. **Itch.io Release**
   - Free or PWYW
   - Gather feedback and bug reports
   - Build community on Discord
   - Iterate on gameplay based on feedback

2. **Web Version**
   - Deploy to Vercel/Netlify
   - Free to play in browser
   - Collect analytics
   - Test monetization strategies

### Phase 2: Platform Expansion (Month 3-4)
3. **Steam Release**
   - Apply for Steamworks account
   - Integrate Steamworks SDK
   - Launch with 10-20% discount
   - Run launch week promotion
   - Target: 100-500 wishlists before launch

4. **Microsoft Store**
   - Convert to APPX
   - Submit for certification
   - Coordinate with Steam launch

### Phase 3: Growth (Month 5+)
5. **Additional Platforms**
   - Apply to GOG (if game is polished enough)
   - Consider Epic Games Store
   - Mac App Store (if macOS build solid)

6. **Post-Launch Support**
   - Regular content updates
   - Community engagement
   - Bug fixes and optimizations
   - Consider DLC or expansion content

---

## 💰 Pricing Strategy

### Recommended Price Tiers for Reflex This
Based on similar indie puzzle/reflex games:

- **Budget Tier**: $2.99 - $4.99
  - Good for initial release
  - Low barrier to entry
  - Frequent sales (50% off)

- **Standard Tier**: $6.99 - $9.99
  - More polished experience
  - 10-15 hours of content
  - Regular sales (33% off)

- **Premium Tier**: $12.99 - $14.99
  - Extensive content
  - Multiple game modes (you have 6!)
  - Cosmetics/unlockables
  - Rare sales (20% off)

### Regional Pricing
- Use Steam's suggested regional pricing
- Adjust for purchasing power parity
- Important markets: US, EU, UK, Brazil, Russia, China

### Launch Discount
- 10-20% off for first week
- Build momentum and reviews
- Don't discount too heavily (devalues game)

---

## 🛠 Technical Implementation Guide

### Steamworks Integration for Electron

#### 1. Install Greenworks
```bash
npm install greenworks --save
```

#### 2. Initialize Steam
```typescript
// lib/steamworks.ts
import greenworks from 'greenworks';

export const initializeSteam = () => {
  try {
    if (greenworks.initAPI()) {
      console.log('Steam initialized successfully');
      return true;
    }
  } catch (error) {
    console.error('Steam initialization failed:', error);
    return false;
  }
};

export const isSteamRunning = () => {
  return greenworks.isSteamRunning();
};
```

#### 3. Implement Achievements
```typescript
// lib/steamAchievements.ts
import greenworks from 'greenworks';

export const unlockAchievement = (achievementId: string) => {
  if (!greenworks.isSteamRunning()) return;
  
  greenworks.activateAchievement(
    achievementId,
    () => console.log(`Achievement unlocked: ${achievementId}`),
    (err) => console.error('Achievement error:', err)
  );
};

export const getAchievements = () => {
  return new Promise((resolve, reject) => {
    greenworks.getAchievements(
      (achievements) => resolve(achievements),
      (err) => reject(err)
    );
  });
};
```

#### 4. Cloud Saves
```typescript
// lib/steamCloud.ts
import greenworks from 'greenworks';

export const saveToCloud = (filename: string, data: string) => {
  greenworks.saveTextToFile(
    filename,
    data,
    () => console.log('Saved to Steam Cloud'),
    (err) => console.error('Cloud save error:', err)
  );
};

export const loadFromCloud = (filename: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    greenworks.readTextFromFile(
      filename,
      (data) => resolve(data),
      (err) => reject(err)
    );
  });
};
```

### Auto-Updater Implementation

```bash
npm install electron-updater --save
```

```typescript
// electron/main.js (update your existing file)
const { autoUpdater } = require('electron-updater');

// Configure auto-updater
autoUpdater.checkForUpdatesAndNotify();

autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update_available');
});

autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update_downloaded');
});

// Add to your existing main.js initialization
app.on('ready', () => {
  // Your existing code...
  
  // Check for updates
  autoUpdater.checkForUpdatesAndNotify();
});
```

### Code Signing

#### Windows (requires certificate)
```json
// package.json - update your build config
{
  "build": {
    "win": {
      "certificateFile": "path/to/certificate.pfx",
      "certificatePassword": "your-password",
      "sign": "./sign.js",
      "signingHashAlgorithms": ["sha256"]
    }
  }
}
```

#### macOS (requires Apple Developer account)
```json
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Your Name (TEAM_ID)",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist"
    }
  }
}
```

---

## 📊 Success Metrics & Goals

### First Month Goals
- **Units Sold**: 100-500 copies
- **Gross Revenue**: $300-$2,500
- **Review Score**: 4+ stars / "Very Positive" on Steam
- **Reviews**: 10+ reviews (critical for visibility)
- **Refund Rate**: <10%

### First Year Goals
- **Units Sold**: 1,000-5,000 copies
- **Gross Revenue**: $3,000-$25,000
- **Active Players**: 100+ monthly
- **Community**: 500+ Discord members
- **Updates**: 4-8 content updates

### Key Performance Indicators (KPIs)
- **Wishlist-to-Purchase**: Target 20-25%
- **Conversion Rate**: Visitors to purchases (target 2-5%)
- **Average Session**: 20-30 minutes
- **Return Rate**: % of players who return (target 40%+)
- **Virality**: Shares, streams, user-generated content

---

## 🎓 Resources & Learning

### Essential Reading
- [Steam Partner Documentation](https://partner.steamgames.com/doc/home)
- [GOG Developer Portal](https://www.gog.com/indie)
- [Electron Builder Docs](https://www.electron.build/)
- [Greenworks GitHub](https://github.com/greenheartgames/greenworks)

### Community & Support
- [r/gamedev](https://reddit.com/r/gamedev) - General game development
- [r/IndieGaming](https://reddit.com/r/IndieGaming) - Indie promotion
- [Steamworks Development Forum](https://steamcommunity.com/groups/steamworks)
- [Electron Discord](https://discord.gg/electron)

### Marketing Resources
- [How to Market a Game](https://howtomarketagame.com/) - Chris Zukowski's blog
- [Indie Game Marketing](https://www.gamedeveloper.com/business/indie-game-marketing)
- [Steam's Visibility Rounds](https://partner.steamgames.com/doc/marketing/visibility)

---

## ⚠️ Common Pitfalls to Avoid

1. **Launching Too Early**
   - Wait until game is polished
   - First impressions are everything
   - Negative reviews are hard to overcome

2. **Ignoring Marketing**
   - Start building audience 3-6 months before launch
   - No one will find your game without promotion
   - Expect 80% of success from marketing, 20% from quality

3. **Poor Store Page**
   - Low-quality screenshots/trailer = no sales
   - Description must be compelling
   - Compare to successful similar games

4. **Not Responding to Feedback**
   - Engage with your community
   - Fix critical bugs immediately
   - Show active development

5. **Wrong Pricing**
   - Too expensive = no sales
   - Too cheap = perceived as low quality
   - Research competitors thoroughly

6. **No Post-Launch Support**
   - Plan for updates and DLC
   - Keep community engaged
   - Long-tail sales are significant

---

## 🎉 Conclusion

**For Reflex This, we recommend:**

1. **Start with Itch.io** (Week 1-2)
   - Free/PWYW to build audience
   - Gather feedback
   - Polish based on player input

2. **Launch on Steam** (Month 3)
   - Primary revenue source
   - Price at $4.99-$7.99
   - 10-20% launch discount
   - Target 200+ wishlists before launch

3. **Expand to Microsoft Store** (Month 4)
   - Additional visibility
   - Cross-promotion with Steam

4. **Apply to GOG** (Month 6+)
   - After game is proven on Steam
   - Polished and well-reviewed

5. **Consider Web Freemium** (Ongoing)
   - Free browser version
   - Upsell desktop version with extra features
   - Generate wishlists for Steam

**Realistic First-Year Projection:**
- 1,000-3,000 units sold across all platforms
- $3,000-$15,000 gross revenue
- Strong foundation for future titles

**Key Success Factors:**
1. **Polish**: Make it feel professional
2. **Marketing**: Build audience before launch
3. **Community**: Engage with players
4. **Updates**: Show ongoing development
5. **Pricing**: Competitive and fair

Good luck with your launch! 🚀

---

**Questions or Need Help?**
- Steam: Use Steamworks Developer Forums
- General: r/gamedev, r/indiegaming
- Technical: Electron Discord, Stack Overflow

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Next Review**: Before Steam launch preparation