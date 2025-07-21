# Complete Updated User Message Template

## Replace the ENTIRE User Message Template with this:

```
Please analyze the new opportunity detailed in the provided new opportunity information (<opp_details> tag) and the historical project dataset provided in the <project_data> tag. Generate a comprehensive analysis and prediction report. The new opportunity's Close Date (from the new opportunity information, format M/D/YYYY) is {CloseDate_placeholder_for_rule_reference_only}. Follow ALL instructions below for the report content, structure, formatting, and calculations. Do not deviate from the specified format in any way:

===ANALYSIS METHODOLOGY=== (Your "ANALYSIS METHODOLOGY" section MUST begin with a bullet point precisely stating the total number of historical projects received and that ALL projects were analyzed. You MUST use and adapt the following template for your FIRST bullet point: "- Analyzed ALL N=[ACTUAL_N_PROJECTS_AVAILABLE] historical projects in the provided dataset. The dataset is pre-filtered and ranked by relevance, ensuring comprehensive analysis of all available data for maximum prediction accuracy. [If any filtering occurred due to data quality issues, briefly explain what was filtered and why.]" Then, continue with 2-4 additional bullet points. Each point should be a concise sentence. These subsequent points MUST clearly explain how the complete dataset of N projects (and patterns observed within them, such as their historical timelines, durations, and costs) was used to inform your predictions (LAUNCH_DATE, PREDICTED_PROJECT_DURATION, ARR, services) for the new opportunity.)

===SIMILAR PROJECTS=== {From the provided historical project dataset, select and detail only the top 3 most representative unique historical projects (unique by opportunity_18_character_oppty_id, preferring highest relevance_score if duplicates exist). These 3 projects should be the most illustrative for comparison to the new opportunity. For each of these 3 projects, provide the following information with the specified friendly labels and in the order shown, each on a new line starting with a hyphen bullet ("- "). Extract information directly and verbatim from the corresponding fields in the historical project dataset for that project, unless a calculation or summary is specified. Ensure all monetary values are formatted as $XXX,XXX with no decimals, unless the raw value is non-numeric (e.g., empty, "12", "N/A") in which case use it as is or as "N/A". For dates, if available in format YYYY-MM-DD, use that; otherwise, use "N/A".}

--- Project 1 ---
• Project Name: {opportunity_name_from_data}
• Customer: {customer_name_from_data_if_available_else_NA}
• Partner: {partner_name_from_data_if_available_else_NA}
• Industry: {industry_from_data_if_available_else_NA}
• Customer Segment: {customer_segment_from_data_if_available_else_NA}
• Region: {opportunity_region_from_data_if_available_else_NA} (Sub-Region: {oppertunity_sub_region_from_data_if_available_else_NA}, Country: {country_from_data_if_available_else_NA})
• Activity/Focus: {activity_name_from_data_if_available_else_NA}
• Description: {Single, very brief sentence summarizing the historical project's 'description' field. Max 20 words.}
• Business Description: {Single, very brief sentence summarizing the historical project's 'business_description' field. Max 25 words.}
• Historical Close Date: {historical_opportunity_won_date}
• Historical Start Date: {planned_delivery_start_date_from_data_YYYY-MM-DD_else_NA}
• Historical End Date: {planned_delivery_end_date_from_data_YYYY-MM-DD_else_NA}
• Actual Gap Time (Days): {Calculated: planned_delivery_start_date - Historical Close Date (using the YYYY-MM-DD value from the 'historical_opportunity_won_date' field). If dates invalid/missing, state "N/A".}
• Actual Execution Duration (Months): {Calculated duration in whole months: (Historical End Date - Historical Start Date). If dates invalid/missing, state "N/A". Round up.}
• Migration Phase (Historical): {migration_phase_from_data_if_available_else_NA}
• Salesforce Link: https://aws-crm.lightning.force.com/lightning/r/Opportunity/{opportunity_18_character_oppty_id}/view
• AWS Calculator Link: {apfp_aws_calculator_url_from_data_if_available_else_NA}
• Historical Financials (Calculated from its Service Costs):
o Total MRR: ${Calculated sum of all 'monthly $ serviceX' fields for this project from the historical project dataset. Format $XXX,XXX. If no numeric service costs, state "N/A".}
o Total ARR: ${Calculated ((this project's Total MRR as numeric) * 12) + sum of all its numeric 'upfront $ serviceX' fields for this project from the historical project dataset. Format $XXX,XXX. If no numeric service costs, state "N/A".}
o Stated Historical Raw ARR: ${raw_annual_run_rate_usd_from_data_formatted_if_available_else_NA}
• Top Services (Historical Project):
o {aws_service_1_for_this_project}|${monthly_cost_1_for_this_project_formatted}/month|${upfront_cost_1_for_this_project_formatted} upfront
o {aws_service_2_for_this_project}|${monthly_cost_2_for_this_project_formatted}/month|${upfront_cost_2_for_this_project_formatted} upfront
o {aws_service_3_for_this_project}|${monthly_cost_3_for_this_project_formatted}/month|${upfront_cost_3_for_this_project_formatted} upfront
o {aws_service_4_for_this_project}|${monthly_cost_4_for_this_project_formatted}/month|${upfront_cost_4_for_this_project_formatted} upfront
o {If more than 4 services with costs for this project, add on a new line: OTHER_SERVICES: Combined|${remaining_monthly_for_this_project_formatted}/month|${remaining_upfront_for_this_project_formatted} upfront. If 4 or less with costs, omit OTHER_SERVICES line.}

{Repeat this entire bulleted block, clearly delineated with "--- Project 2 ---", "--- Project 3 ---" as separators, for exactly 3 unique similar projects.}

===DETAILED FINDINGS=== (Provide key insights derived from comparing the new opportunity with ALL historical projects. Present as a bulleted list of max 3-4 brief points. Each point should be a short, impactful phrase or a single, very concise sentence.)

===PREDICTION RATIONALE=== (Explain the core reasoning behind your predictions in SUMMARY METRICS (including PREDICTED_ARR, LAUNCH_DATE, and PREDICTED_PROJECT_DURATION), based on your analysis of ALL historical projects. Present as a bulleted list of max 2-4 brief points. Each point should be a concise sentence focusing on critical drivers from the new opportunity details and patterns observed across all projects.)

===RISK FACTORS=== (List potential risks for the new opportunity, informed by the analysis of ALL historical projects and the nature of the new opportunity. Present as a bulleted list of max 3-4 concise phrases.)

===ARCHITECTURE DESCRIPTION=== (Based on the new opportunity description and common patterns from ALL historical projects, describe a plausible high-level AWS architecture. Use the following sub-headings. For each sub-heading (NETWORK_FOUNDATION, COMPUTE_LAYER, etc.), provide a list of key components OR a single, very brief descriptive phrase (max 15 words). If a sub-component is not applicable or cannot be inferred, state "N/A" or "Could not be determined.")

NETWORK_FOUNDATION: {Single line description or list key components of predicted VPCs, subnets, networking for the new opportunity based on patterns across ALL historical projects and the new opportunity information}
COMPUTE_LAYER: {Single line description or list key components of predicted compute resources for the new opportunity based on patterns across ALL historical projects and the new opportunity information}
DATA_LAYER: {Single line description or list key components of predicted data resources for the new opportunity based on patterns across ALL historical projects and the new opportunity information}
SECURITY_COMPONENTS: {Single line description or list key components of predicted security elements for the new opportunity based on patterns across ALL historical projects and the new opportunity information}
INTEGRATION_POINTS: {Single line description or list key components of predicted integrations for the new opportunity based on patterns across ALL historical projects and the new opportunity information}
SCALING_ELEMENTS: {Single line description or list key components of predicted scaling for the new opportunity based on patterns across ALL historical projects and the new opportunity information}
MANAGEMENT_TOOLS: {Single line description or list key components of predicted tools for the new opportunity based on patterns across ALL historical projects and the new opportunity information}
COMPLETE_ARCHITECTURE: {A single, brief paragraph (max 2-3 concise sentences) summarizing how these components work together for the proposed solution.}

===SUMMARY METRICS===
PREDICTED_ARR: ${formatted_arr}
MRR: ${formatted_mrr}
LAUNCH_DATE: {YYYY-MM}
PREDICTED_PROJECT_DURATION: {String like "X months" or "Y years and Z months"}
TOP_SERVICES:
{aws_service_1}|${monthly_cost_1}/month|${upfront_cost_1} upfront
{aws_service_2}|${monthly_cost_2}/month|${upfront_cost_2} upfront
{aws_service_3}|${monthly_cost_3}/month|${upfront_cost_3} upfront
{aws_service_4}|${monthly_cost_4}/month|${upfront_cost_4} upfront
OTHER_SERVICES: Combined|${remaining_monthly}/month|${remaining_upfront} upfront
CONFIDENCE: {HIGH|MEDIUM|LOW}

===VALIDATION_ERRORS=== {List any validation errors or inconsistencies you encountered based on your internal rule checks (e.g., if data for timeline calculations was insufficient or if predicted service costs seem anomalous compared to similar projects). Leave blank if none identified by you. Downstream script will add its own validation messages. Ensure this section is fully generated.}

RULES FOR ===SIMILAR PROJECTS=== SECTION (using data from the historical project dataset):
• Historical Dates:
o For Historical Close Date (when the historical opportunity was won), use the value directly from the project's historical_opportunity_won_date field. This field is already pre-formatted as YYYY-MM-DD in the input data you receive.
o For Historical Start Date (when the project delivery started), extract from the project's planned_delivery_start_date field (typically already YYYY-MM-DD).
o For Historical End Date (when the project delivery concluded), extract from the project's planned_delivery_end_date field (typically already YYYY-MM-DD).
o Crucially, these are distinct dates. Historical Close Date represents when the opportunity was won, and Historical End Date represents when the project delivery finished. They must be sourced from their respective fields (historical_opportunity_won_date, planned_delivery_start_date, planned_delivery_end_date). Do not substitute one for another. If historical_opportunity_won_date is "N/A" or missing, or other date fields are missing or not valid YYYY-MM-DD strings, display "N/A" for that specific date. The historical_opportunity_won_date value is crucial for gap time calculation.
• Actual Gap Time (Days): Calculate as (planned_delivery_start_date - Historical Close Date) in days for the historical project, using the YYYY-MM-DD formatted dates. If either date is "N/A", state "N/A" for the gap time.
• Actual Execution Duration (Months): Calculate as (Historical End Date - Historical Start Date) for the historical project, using YYYY-MM-DD formatted dates. Result should be a whole number of months (e.g., if duration is 45 days, output "2 months" by rounding up; if 70 days, output "3 months"). If dates are "N/A", state "N/A".
• Other fields: As detailed in the template above.

SERVICE FORMAT REQUIREMENTS (for PREDICTED services for the NEW opportunity in ===SUMMARY METRICS===):
• Format all monetary values as $XXX,XXX with no decimals
• If upfront cost is $0, display as "$0 upfront"
• Service names should be official AWS service names (e.g., "Amazon EC2", "Amazon RDS", "Amazon S3")
• Monthly costs should reflect realistic pricing based on historical patterns

CALCULATION RULES (for PREDICTED values for the NEW opportunity in ===SUMMARY METRICS===):
• ARR = (MRR × 12) + Total Annual Upfront Costs
• MRR = Sum of all monthly service costs
• All financial calculations should be based on patterns observed across ALL historical projects
• Timeline predictions should account for typical mobilization periods observed across ALL historical projects
• Service selections should reflect the most common and relevant services from ALL historical projects for similar opportunities
```

## Instructions:

1. **Copy the entire text above** (everything between the triple backticks)
2. **Go to AWS Bedrock Console**
3. **Find prompt FDUHITJIME**
4. **Replace the ENTIRE User Message Template** with the text above
5. **Save as version 8**
6. **Update your .env file** to use `:8` instead of `:7`

## Key Changes Made:

- **Removed ALL 85% subset logic**
- **Removed ALL "M=" calculations**
- **Changed to "Analyzed ALL N= projects"**
- **Updated validation to say "ALL N projects"**
- **Emphasized "ALL historical projects" throughout**
- **Removed conflicting subset instructions**

This will finally make the AI analyze all 200 opportunities instead of limiting to ~32.