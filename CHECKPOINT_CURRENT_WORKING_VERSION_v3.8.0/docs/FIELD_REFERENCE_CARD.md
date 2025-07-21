# Enhanced UI Fields - Quick Reference Card

## Input Fields Reference

### Basic Details Section ⭐ (All Required)
| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| **Customer Name** | Text | Customer organization | "Acme Corporation" |
| **Opportunity Name** | Text | Project identifier | "Cloud Migration Initiative" |
| **Opportunity Description** | Textarea | Detailed project scope | "Migrate legacy systems to AWS..." |

### Location & Timing Section ⭐ (All Required)
| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| **Region** | Dropdown | AWS deployment region | "us-east-1 (N. Virginia)" |
| **Close Date** | Date | Expected start/close date | "2024-12-31" |

### Business Context Section (Optional)
| Field | Type | Purpose | Options/Example |
|-------|------|---------|-----------------|
| **Industry** | Dropdown | Customer industry | Financial Services, Healthcare, Manufacturing, etc. |
| **Customer Segment** | Dropdown | Organization size | Enterprise, Mid-Market, SMB, Public Sector |
| **Partner Name** | Text | AWS partner involved | "AWS Premier Partner Inc." |

### Technical Details Section (Optional)
| Field | Type | Purpose | Options/Example |
|-------|------|---------|-----------------|
| **Activity Focus** | Dropdown | Engagement type | Migration, Modernization, New Development, Analytics |
| **Business Description** | Textarea | Additional context | "Modernize systems for scalability..." |
| **Migration Phase** | Dropdown | Current project phase | Assessment, Planning, Migration, Optimization |
| **Salesforce Link** | URL | CRM integration | "https://company.salesforce.com/..." |
| **AWS Calculator Link** | URL | Cost estimate reference | "https://calculator.aws/#/..." |

## Projection Fields Reference

### Financial Projections (Auto-Populated)
| Field | Display Format | Description |
|-------|----------------|-------------|
| **ARR** | $XXX,XXX (±X%) | Annual Recurring Revenue with confidence range |
| **MRR** | $XX,XXX (X.X% of ARR) | Monthly Recurring Revenue with ARR relationship |

### Timeline Projections (Auto-Populated)
| Field | Display Format | Description |
|-------|----------------|-------------|
| **Launch Date** | Month YYYY (X days) | Predicted launch with countdown |
| **Time to Launch** | X months (Y weeks) | Duration with milestone breakdown |

### Quality Indicators (Auto-Populated)
| Field | Display Format | Description |
|-------|----------------|-------------|
| **Confidence Level** | HIGH/MEDIUM/LOW | Color-coded confidence with score |
| **Top Services** | Service: $X/month | Recommended services with costs |

## Analysis Results Reference

### Core Analysis Sections (Auto-Populated)
| Section | Content Type | Description |
|---------|--------------|-------------|
| **Methodology** | Structured Text | Analysis approach and data sources |
| **Similar Projects** | Interactive Table | Historical project matches with details |
| **Detailed Findings** | Bullet Points | Key insights with supporting data |
| **Prediction Rationale** | Structured Text | Explanation of prediction logic |
| **Risk Factors** | Risk List | Identified risks with severity and mitigation |

### Architecture Recommendations (Auto-Populated)
| Section | Content Type | Description |
|---------|--------------|-------------|
| **Network Foundation** | Service List | VPC, subnets, security groups |
| **Compute Layer** | Service List | EC2, containers, serverless options |
| **Data Layer** | Service List | Databases, caching, storage |
| **Security Components** | Service List | IAM, encryption, monitoring |
| **Integration Points** | Service List | APIs, messaging, data integration |
| **Scaling Elements** | Service List | Auto-scaling, performance optimization |
| **Management Tools** | Service List | Deployment, monitoring, governance |

## Action Buttons Reference

### Primary Analysis Actions
| Button | Purpose | When to Use |
|--------|---------|-------------|
| **Analyze (Standard)** | Standard Bedrock analysis | General opportunities, faster results |
| **Analyze (Nova Premier)** | Advanced AI analysis | Complex opportunities, higher accuracy |
| **Funding Analysis** | Financial modeling | Investment justification needed |

### Secondary Actions
| Button | Purpose | When to Use |
|--------|---------|-------------|
| **Next Opportunity** | Follow-on analysis | Identify additional opportunities |
| **Reset Form** | Clear all fields | Start new analysis |
| **Export Results** | Generate report | Share or save analysis |

## Validation Indicators

### Visual Indicators
| Indicator | Meaning | Action Required |
|-----------|---------|-----------------|
| ✅ Green Checkmark | Valid input | None |
| ❌ Red X | Invalid input | Fix the error |
| ⚠️ Yellow Warning | Incomplete/Optional | Consider completing |
| 🔄 Loading Spinner | Processing | Wait for completion |

### Confidence Levels
| Level | Color | Meaning | Reliability |
|-------|-------|---------|-------------|
| **HIGH** | Green | >80% confidence | Strong historical matches |
| **MEDIUM** | Yellow | 60-80% confidence | Moderate matches |
| **LOW** | Red | <60% confidence | Limited historical data |

## Quick Workflow Checklist

### Pre-Analysis ✅
- [ ] Complete all required fields (marked with ⭐)
- [ ] Fill optional fields where information is available
- [ ] Verify all validation indicators are green
- [ ] Review information for accuracy

### Analysis Execution ✅
- [ ] Select appropriate analysis type
- [ ] Monitor progress indicators
- [ ] Wait for all sections to populate
- [ ] Review results for completeness

### Post-Analysis ✅
- [ ] Validate financial projections are reasonable
- [ ] Review similar projects for relevance
- [ ] Assess risk factors and mitigation strategies
- [ ] Export results if needed

## Common Field Combinations

### Migration Project Template
```
Customer Name: [Enterprise Name]
Opportunity Name: "[System] Migration to AWS"
Description: "Migrate [legacy system] to AWS cloud..."
Region: [Primary business region]
Industry: [Customer industry]
Customer Segment: Enterprise
Activity Focus: Migration
Migration Phase: Assessment
```

### Modernization Project Template
```
Customer Name: [Organization Name]
Opportunity Name: "[Application] Modernization"
Description: "Modernize [application] using cloud-native..."
Region: [Cost-effective region]
Industry: [Relevant industry]
Customer Segment: [Appropriate size]
Activity Focus: Modernization
Migration Phase: Planning
```

### New Development Template
```
Customer Name: [Organization Name]
Opportunity Name: "New [Solution] Development"
Description: "Develop new [solution] using AWS services..."
Region: [User-proximity region]
Industry: [Target industry]
Activity Focus: New Development
Migration Phase: Assessment
```

---

**💡 Pro Tips:**
- Use specific, detailed descriptions for better analysis accuracy
- Complete optional fields when information is available
- Review similar projects to validate predictions
- Export results for stakeholder sharing
- Use Nova Premier for high-value or complex opportunities

## Enhanced Field Validation Guide

### Field Validation Details

#### Required Field Validation
| Field | Min Length | Max Length | Special Rules |
|-------|------------|------------|---------------|
| **Customer Name** | 2 chars | 100 chars | No special characters except spaces, hyphens, periods |
| **Opportunity Name** | 3 chars | 150 chars | Alphanumeric, spaces, hyphens allowed |
| **Opportunity Description** | 10 chars | 2000 chars | Rich text, recommended 50+ chars for best results |
| **Region** | N/A | N/A | Must select from dropdown |
| **Close Date** | N/A | N/A | Must be future date, format YYYY-MM-DD |

#### Optional Field Validation
| Field | Validation Rules | Format Requirements |
|-------|------------------|-------------------|
| **Industry** | Dropdown selection or "Other" with text | Text input if "Other" selected |
| **Customer Segment** | Dropdown selection | Predefined options only |
| **Partner Name** | 0-100 chars | Optional text input |
| **Activity Focus** | Dropdown selection | Predefined options only |
| **Business Description** | 0-1000 chars | Optional textarea |
| **Migration Phase** | Dropdown selection | Predefined options only |
| **Salesforce Link** | Valid URL format | Must start with http:// or https:// |
| **AWS Calculator Link** | Valid URL format | Must start with http:// or https:// |

### Real-Time Validation Indicators

#### Visual Feedback System
- **🟢 Green Circle**: Field is valid and complete
- **🔴 Red Circle**: Field has validation errors
- **🟡 Yellow Circle**: Field is optional but recommended
- **⚪ Gray Circle**: Field is empty and optional
- **🔄 Blue Circle**: Field is being validated

#### Error Message Types
- **"This field is required"**: Missing required field
- **"Minimum X characters required"**: Text too short
- **"Please enter a valid URL"**: Invalid URL format
- **"Date must be in the future"**: Invalid date selection
- **"Please select an option"**: Dropdown not selected

## Advanced Usage Patterns

### Progressive Field Completion
1. **Phase 1 - Minimum Viable Analysis**
   - Complete only required fields (⭐ marked)
   - Run initial Standard Analysis
   - Review baseline predictions

2. **Phase 2 - Enhanced Context**
   - Add Industry and Customer Segment
   - Include Activity Focus and Migration Phase
   - Re-run analysis for improved accuracy

3. **Phase 3 - Complete Profile**
   - Add all optional fields where available
   - Include reference links
   - Run Nova Premier Analysis for maximum accuracy

### Field Interdependencies

#### Smart Field Relationships
- **Industry + Customer Segment**: Influences confidence levels and similar project matching
- **Activity Focus + Migration Phase**: Affects timeline predictions and architecture recommendations
- **Region + Industry**: Impacts compliance requirements and service availability
- **Description + Activity Focus**: Determines analysis approach and service recommendations

#### Conditional Field Logic
- **"Other" Industry Selection**: Enables text input for custom industry
- **Partner Name**: More relevant for certain customer segments
- **Migration Phase**: Most relevant for Migration and Modernization activities
- **Calculator Link**: Most valuable for large or complex opportunities

### Field Completion Strategies

#### Time-Constrained Analysis (5 minutes)
- Focus on required fields only
- Use Standard Analysis
- Add key optional fields if time permits
- Export basic results

#### Comprehensive Analysis (15-20 minutes)
- Complete all available fields
- Use Nova Premier Analysis
- Review and validate all inputs
- Export detailed report

#### Iterative Refinement (Multiple sessions)
- Start with basic analysis
- Gather additional information
- Update fields and re-analyze
- Track prediction changes over time

## Field-Specific Usage Tips

### Customer Name Optimization
- **Research First**: Verify official company name
- **Be Consistent**: Use same format for multiple opportunities
- **Include Context**: Add subsidiary or division if relevant
- **Avoid Nicknames**: Use formal business names

### Description Writing Best Practices
- **Start with Scope**: Begin with high-level project scope
- **Add Technical Details**: Include specific technologies and services
- **Mention Scale**: Include numbers, users, data volumes
- **Include Drivers**: Explain business motivations
- **Use Keywords**: Include relevant technical terms

### Region Selection Strategy
- **Primary Consideration**: User/data location
- **Secondary Factors**: Compliance, cost, service availability
- **Multi-Region**: Choose primary region, mention others in description
- **Future Planning**: Consider expansion regions

### Industry Classification Tips
- **Be Specific**: Choose most specific applicable option
- **Consider Regulations**: Factor in compliance requirements
- **Use "Other" Sparingly**: Only when no option fits
- **Document Choice**: Note rationale in Business Description

## Troubleshooting Field Issues

### Common Validation Problems
1. **Date Format Issues**
   - Use date picker instead of typing
   - Ensure future date selection
   - Check browser date format settings

2. **URL Validation Failures**
   - Include http:// or https:// prefix
   - Verify URL is accessible
   - Remove extra spaces or characters

3. **Text Length Issues**
   - Check character count indicators
   - Use concise but descriptive language
   - Break long descriptions into paragraphs

4. **Dropdown Selection Problems**
   - Ensure option is fully selected
   - Try clicking away and back to field
   - Refresh page if dropdown not responding

### Performance Optimization
- **Complete Required Fields First**: Enables analysis sooner
- **Save Progress**: Use browser back/forward to preserve entries
- **Avoid Excessive Length**: Keep descriptions focused and relevant
- **Use Copy/Paste**: For repeated information across opportunities

## Integration and Automation

### CRM Integration Fields
- **Salesforce Link**: Direct integration with opportunity records
- **Customer Name**: Must match CRM naming conventions
- **Opportunity Name**: Should align with CRM opportunity names

### Reporting and Analytics
- **Consistent Naming**: Enables better reporting and analysis
- **Complete Profiles**: Improves prediction accuracy tracking
- **Regular Updates**: Keep information current for trend analysis

### Template Management
- **Save Successful Patterns**: Document field combinations that work well
- **Create Customer Templates**: Pre-populate common customer information
- **Industry Templates**: Standardize industry-specific field patterns

**🔗 Full Documentation:** [User Guide](USER_GUIDE.md) | [Workflow Guide](ENHANCED_WORKFLOW_GUIDE.md)