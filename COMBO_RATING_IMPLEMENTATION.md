# Combo Rating System Implementation Guide

## Overview
This document outlines the implementation of a combo rating system (D, C, B, A, A+, S, SS, SSS) inspired by games like Devil May Cry and Bayonetta.

## Rating System

### Rating Scale
- **D** (Gray) - Basic combos, starting point
- **C** (Blue) - Improving performance
- **B** (Green/Cyan) - Good consistency
- **A** (Yellow) - Strong performance
- **A+** (Orange) - Excellent execution
- **S** (Magenta) - Outstanding combos
- **SS** (Pink) - Master-level performance
- **SSS** (Red) - Perfect execution

### Scoring Factors

The rating is calculated based on multiple factors (0-100 point scale):

1. **Combo Length** (0-50 points)
   - Primary factor
   - Higher combos = more points
   - Adjusted by difficulty level

2. **Speed** (0-25 points)
   - Based on average reaction time
   - <150ms = 25 points
   - >500ms = 0 points
   - Linear interpolation

3. **Consistency** (0-15 points)
   - Based on perfect hit ratio
   - Measures reaction time variance

4. **Perfect Hits** (0-10 points)
   - Ratio of reactions <150ms
   - Rewards fast, consistent performance

### Difficulty Adjustments

Higher difficulties have adjusted thresholds:
- **Easy**: Need 30% more to achieve same rating
- **Medium**: Baseline
- **Hard**: Need 30% less to achieve same rating
- **Nightmare**: Need 50% less to achieve same rating

## Implementation Steps

### 1. Basic Integration (Simple Mode)

Use `getSimpleComboRating()` for quick implementation:

```typescript
import { getSimpleComboRating } from '@/lib/comboRating';

const rating = getSimpleComboRating(combo, difficulty);
```

**Thresholds (Medium difficulty):**
- D: 0-7 combos
- C: 8-14 combos
- B: 15-24 combos
- A: 25-34 combos
- A+: 35-49 combos
- S: 50-74 combos
- SS: 75-99 combos
- SSS: 100+ combos

### 2. Advanced Integration (Full Mode)

Use `calculateComboRating()` for detailed scoring:

```typescript
import { calculateComboRating } from '@/lib/comboRating';

// Track perfect hits in GameContext
const perfectHitCount = reactionTimeStats.allTimes.filter(t => t < 150).length;

const ratingResult = calculateComboRating({
  combo,
  averageReactionTime: reactionTimeStats.average,
  perfectHitCount,
  totalHits: reactionTimeStats.allTimes.length,
  difficulty,
});
```

### 3. Visual Display

The rating should be displayed prominently:
- Show rating letter (D, C, B, A, A+, S, SS, SSS)
- Use color-coded display matching rating
- Add glow effect (intensity increases with rating)
- Animate when rating upgrades
- Show progress to next rating (optional)

### 4. Tracking Perfect Hits

To enable advanced rating calculation, track perfect hits:

```typescript
// In GameContext or game page
const perfectHitCount = reactionTimeStats.allTimes.filter(
  time => time < 150
).length;
```

## Visual Design Suggestions

### Rating Display Options

**Option 1: Above Combo Number**
```
COMBO
  [Rating Badge]
   25
```

**Option 2: Next to Combo Number**
```
COMBO
  25 [S]
```

**Option 3: Below Combo Number**
```
COMBO
   25
  [S Rating]
```

**Option 4: Integrated Badge**
```
COMBO
  [S] 25
```

### Animation Suggestions

1. **Rating Upgrade Animation**
   - Scale up when rating increases
   - Color transition
   - Glow pulse effect
   - Sound effect (optional)

2. **Rating Display**
   - Subtle pulse for current rating
   - Glow intensity based on rating level
   - Smooth color transitions

## Integration Points

### Files to Modify

1. **`components/ComboDisplay.tsx`**
   - Add rating display
   - Import rating functions
   - Add rating upgrade animations

2. **`lib/GameContext.tsx`** (Optional for advanced mode)
   - Track perfect hit count
   - Expose rating calculation

3. **`app/game/page.tsx`** (Optional for advanced mode)
   - Pass reaction time stats to ComboDisplay
   - Track perfect hits

## Example Usage

### Simple Implementation

```typescript
// In ComboDisplay.tsx
import { getSimpleComboRating, getRatingDisplay } from '@/lib/comboRating';

const rating = getSimpleComboRating(combo, difficulty);
const ratingDisplay = getRatingDisplay(rating);

return (
  <div>
    <div style={{ color: ratingDisplay.color }}>
      {ratingDisplay.label}
    </div>
    <div>{combo}x</div>
  </div>
);
```

### Advanced Implementation

```typescript
// In ComboDisplay.tsx
import { calculateComboRating, getRatingDisplay } from '@/lib/comboRating';

const ratingResult = calculateComboRating({
  combo,
  averageReactionTime: reactionTimeStats.average,
  perfectHitCount,
  totalHits: reactionTimeStats.allTimes.length,
  difficulty,
});

const ratingDisplay = getRatingDisplay(ratingResult.rating);

return (
  <div>
    <div style={{ 
      color: ratingDisplay.color,
      textShadow: `0 0 ${ratingDisplay.glowIntensity * 10}px ${ratingDisplay.color}`
    }}>
      {ratingDisplay.label}
    </div>
    <div>{combo}x</div>
    {/* Optional: Show progress */}
    {ratingResult.nextRatingThreshold && (
      <div>Next: {ratingResult.nextRatingThreshold - ratingResult.score} points</div>
    )}
  </div>
);
```

## Benefits

1. **Player Motivation**: Clear progression system encourages improvement
2. **Visual Feedback**: Color-coded ratings provide instant feedback
3. **Skill Measurement**: Multi-factor scoring rewards both speed and consistency
4. **Difficulty Scaling**: Adjusted thresholds make ratings meaningful across difficulties
5. **Competitive Element**: Players can strive for higher ratings

## Future Enhancements

1. **Rating History**: Track best rating achieved
2. **Achievements**: Unlock achievements for reaching certain ratings
3. **Leaderboards**: Rank players by best rating
4. **Rating Breakdown**: Show detailed score breakdown in stats
5. **Sound Effects**: Different sounds for rating upgrades
6. **Screen Effects**: Special effects for S/SS/SSS ratings

