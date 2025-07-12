# Updated User Message Template

## Problem Found
The user message template in your Bedrock prompt still contains the old 85% subset logic, which is overriding the updated system instructions.

## What to Update in Bedrock Prompt

In your Bedrock prompt FDUHITJIME:7, you need to update the **User Message Template** to remove the conflicting instructions.

### Find and Replace These Sections:

#### 1. In the ANALYSIS METHODOLOGY section, replace:
```
"- Started with [TOTAL_RECORDS_PROVIDED] historical projects in the provided dataset. After de-duplication and data validation, N=[ACTUAL_N_PROJECTS_AVAILABLE] unique projects remained available for analysis. Selected a focused subset of M=[YOUR_CALCULATED_M_VALUE] most relevant projects for core predictive analysis, representing the top ~85% most relevant opportunities (with a minimum of 20 projects applied when N was sufficient). [If significant filtering occurred, briefly explain what was filtered and why.]"
```

#### With:
```
"- Analyzed ALL N=[ACTUAL_N_PROJECTS_AVAILABLE] historical projects in the provided dataset. The dataset is pre-filtered and ranked by relevance, ensuring comprehensive analysis of all available data for maximum prediction accuracy. [If any filtering occurred due to data quality issues, briefly explain what was filtered and why.]"
```

#### 2. Remove all references to "M" calculations and 85% logic

#### 3. In the validation section, replace:
```
"Confirmation: Core analysis based on M=[M_value_you_used] of N=[N_value_after_filtering] projects (from [TOTAL_RECORDS_PROVIDED] originally provided). M was determined by [briefly state how M was derived, e.g., 'selecting the top 85% most relevant projects, with a minimum of 20 applied']. [If significant filtering occurred, note the reason for the reduction from original count to N.]"
```

#### With:
```
"Confirmation: Comprehensive analysis based on ALL N=[N_value_after_filtering] projects in the dataset (from [TOTAL_RECORDS_PROVIDED] originally provided). Full dataset utilized for maximum prediction accuracy. [If significant filtering occurred, note the reason for the reduction from original count to N.]"
```

## Steps to Fix:

1. **Go to AWS Bedrock Console**
2. **Find prompt FDUHITJIME**
3. **Edit the User Message Template** (not the system instructions)
4. **Make the replacements above**
5. **Save as version 8**
6. **Update your .env file** to use version 8

## Why This Happened:
- System instructions say "analyze all data"
- But user message template explicitly instructs "use 85% subset"
- User message instructions override system instructions
- AI follows the more specific user message instructions

Once you fix the user message template, the AI will finally use all 200 opportunities instead of limiting to ~32.