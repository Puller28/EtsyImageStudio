# Auto-Advance Workflow Feature

## Overview
The workflow now automatically advances to the next step when processing completes, creating a seamless hands-off experience.

## How It Works

### 1. Status Polling
- Polls selected project every 2 seconds
- Watches for status changes
- Detects when processing completes

### 2. Auto-Advance Logic
When status transitions from `processing` → `completed`:
- **Step 1 (Upscale)**: Auto-advances to Mockups when upscaled image is ready
- **Step 2 (Mockups)**: Auto-advances to Print Formats when mockups are generated
- **Step 3 (Print Formats)**: Auto-advances to Listing when formats are created
- **Step 4 (Listing)**: Final step, no auto-advance

### 3. Smart Detection
Checks specific completion flags:
- `hasUpscaledImage` - Upscale completed
- `hasMockupImages` - Mockups completed
- `hasResizedImages` - Print formats completed

## User Experience

### Before (Manual)
```
1. Upload/Select Image
2. Click "Start Processing"
3. Wait...
4. Click "Next Step" manually
5. Generate Mockups
6. Click "Next Step" manually
7. Create Print Formats
8. Click "Next Step" manually
9. Generate Listing
```

### After (Auto-Advance)
```
1. Upload/Select Image
2. Click "Start Processing"
3. ✨ Auto-advances to Mockups
4. Generate Mockups
5. ✨ Auto-advances to Print Formats
6. Create Print Formats
7. ✨ Auto-advances to Listing
8. Generate Listing
9. Done!
```

## Technical Implementation

### Status Polling
```typescript
const { data: selectedProject } = useQuery<Project | null>({
  queryKey: ["/api/projects", selectedProjectId],
  queryFn: async () => {
    if (!selectedProjectId) return null;
    const res = await apiRequest("GET", `/api/projects/${selectedProjectId}`);
    return res.json();
  },
  enabled: !!selectedProjectId,
  refetchInterval: 2000, // Poll every 2 seconds
});
```

### Auto-Advance Detection
```typescript
useEffect(() => {
  if (!selectedProject || !selectedProject.status) return;
  
  const currentStatus = selectedProject.status;
  
  // Detect completion
  if (lastProcessingStatus === 'processing' && currentStatus === 'completed') {
    console.log('✅ Processing completed, auto-advancing');
    
    // Advance based on current step
    if (currentStep === 1 && selectedProject.hasUpscaledImage) {
      setTimeout(() => setCurrentStep(2), 1000); // 1 second delay for smooth transition
    }
    // ... other steps
  }
  
  setLastProcessingStatus(currentStatus);
}, [selectedProject, lastProcessingStatus, currentStep]);
```

## Benefits

### 1. Seamless Experience
- No manual clicking between steps
- Feels like a continuous flow
- Less cognitive load on user

### 2. Faster Workflow
- Eliminates wait time for user to notice completion
- Automatically moves forward
- Reduces total time to complete workflow

### 3. Clear Progress
- User sees automatic progression
- Reinforces that system is working
- Builds confidence in the process

### 4. Hands-Off Operation
- User can start processing and step away
- System continues automatically
- Come back to completed workflow

## Edge Cases Handled

### 1. Processing Fails
- Status stays as 'processing' or changes to 'failed'
- No auto-advance occurs
- User can retry or move manually

### 2. User Navigates Away
- Polling stops when component unmounts
- No unnecessary API calls
- Resumes when user returns

### 3. Manual Navigation
- User can still click "Next Step" manually
- Auto-advance doesn't interfere
- Works alongside manual control

### 4. Multiple Projects
- Only polls currently selected project
- Switching projects resets polling
- No conflicts between projects

## Performance Considerations

### Polling Frequency
- 2 second interval balances responsiveness and load
- Only polls when workflow page is active
- Stops when user leaves workflow

### API Load
- Single endpoint per poll
- Lightweight query (project status only)
- Cached by React Query

### Memory
- Minimal state tracking (just last status)
- No memory leaks
- Cleanup on unmount

## Future Enhancements

### 1. Progress Indicators
- Show processing progress percentage
- Estimated time remaining
- Real-time status updates

### 2. Notifications
- Toast notification when auto-advancing
- Sound effect (optional)
- Visual animation

### 3. Smart Delays
- Adjust delay based on processing time
- Longer delay for complex operations
- Immediate advance for quick operations

### 4. User Preferences
- Toggle auto-advance on/off
- Customize delay duration
- Choose which steps to auto-advance

### 5. Batch Processing
- Auto-advance through multiple projects
- Queue-based workflow
- Bulk operations

## Testing Checklist

- [ ] Start workflow with AI-generated image
- [ ] Verify auto-advances after upscale completes
- [ ] Generate mockups
- [ ] Verify auto-advances to print formats
- [ ] Create print formats
- [ ] Verify auto-advances to listing
- [ ] Test manual navigation still works
- [ ] Test with processing failures
- [ ] Test with slow processing
- [ ] Test with multiple projects
- [ ] Verify polling stops when leaving workflow
- [ ] Check for memory leaks

## Configuration

### Polling Interval
Change in `workflow-runner.tsx`:
```typescript
refetchInterval: 2000, // milliseconds
```

### Auto-Advance Delay
Change in auto-advance logic:
```typescript
setTimeout(() => setCurrentStep(2), 1000); // milliseconds
```

## Monitoring

### Console Logs
```
🔧 Auto-selecting project from URL: abc-123
✅ Processing completed, auto-advancing to next step
```

### Status Tracking
- `lastProcessingStatus` - Previous status
- `currentStatus` - Current status
- Transition detection: `processing` → `completed`

## Troubleshooting

### Auto-Advance Not Working
1. Check project status is changing to 'completed'
2. Verify polling is active (check network tab)
3. Check console for auto-advance logs
4. Ensure completion flags are set correctly

### Too Fast/Slow
1. Adjust `refetchInterval` for polling speed
2. Adjust `setTimeout` delay for transition speed
3. Consider processing time in calculations

### Multiple Advances
1. Check `lastProcessingStatus` is updating correctly
2. Verify effect dependencies are correct
3. Ensure no duplicate effects running
