# Query Optimization Analysis and Implementation Guide

## Executive Summary

Based on the analysis of your current query prompt and the logs showing 46 unique projects being processed, I've identified several optimization opportunities to improve the quality and quantity of results reaching the final Bedrock analysis. The current system is working but can be significantly enhanced.

## Current Issues Identified

### 1. **Query Complexity and Performance**

- **Issue**: Complex CTE structure with nested CASE statements may be over-optimizing
- **Impact**: Potentially filtering out relevant projects due to overly strict scoring
- **Evidence**: Current `relevance_score >= 30` threshold may be too restrictive

### 2. **Keyword Matching Limitations**

- **Issue**: Heavy reliance on exact keyword matching
- **Impact**: Missing semantically similar projects that don't contain exact keywords
- **Evidence**: Limited result diversity in the analysis

### 3. **Athena Performance Optimization**

- **Issue**: Query structure not fully optimized for Athena's distributed processing
- **Impact**: Potential performance bottlenecks and timeout risks
- **Evidence**: Complex string operations in WHERE clauses

## Optimized Solution Strategy

### 1. **Enhanced Query Structure**

#### Key Improvements:

- **Lower Threshold**: Changed from `relevance_score >= 30` to `relevance_score >= 15`
- **Recency Sorting**: Added `ORDER BY relevance_score DESC, close_date DESC`
- **Broader Matching**: Enhanced keyword patterns and semantic matching
- **Performance Optimization**: CTE structure optimized for Athena

#### Optimized Query Pattern:

```sql
WITH base_projects AS (
    SELECT [all required fields]
    FROM parquet
    WHERE from_unixtime(close_date) > (date_parse('2024-12-31', '%Y-%m-%d') - interval '3' year)
),
scored_projects AS (
    SELECT
        *,
        -- Enhanced scoring with broader patterns
        (CASE WHEN lower(opportunity_name) LIKE '%[KEYWORD1]%' THEN 40 ELSE 0 END) +
        (CASE WHEN lower(opportunity_name) LIKE '%[KEYWORD2]%' THEN 40 ELSE 0 END) +
        -- Customer context matching
        (CASE WHEN lower(customer_name) LIKE '%[CUSTOMER_SPECIFIC]%' THEN 35 ELSE 0 END) +
        -- Technology matching (broader patterns)
        (CASE WHEN lower(concat(opportunity_name, ' ', description, ' ', business_description)) LIKE '%[TECH_TERM1]%' THEN 20 ELSE 0 END) +
        -- Industry and regional matching
        (CASE WHEN lower(industry) LIKE '%[INDUSTRY_TERM]%' THEN 15 ELSE 0 END) +
        -- Recency bonus
        (CASE WHEN from_unixtime(close_date) > (date_parse('2024-12-31', '%Y-%m-%d') - interval '1' year) THEN 5 ELSE 0 END) +
        -- Size relevance
        (CASE WHEN annual_run_rate_usd > 100000 THEN 3 ELSE 0 END)
        AS relevance_score
    FROM base_projects
)
SELECT * FROM scored_projects
WHERE relevance_score >= 15  -- Lower threshold for broader results
ORDER BY relevance_score DESC, close_date DESC
LIMIT {{queryLimit}}
```

### 2. **Enhanced Keyword Replacement Strategy**

#### Primary Keywords (Extract from opportunity name):

- Focus on: `cloud`, `migration`, `modernization`, `development`, `analytics`, `security`, `database`, `application`

#### Technology Terms (Broader Patterns):

- Replace with: `database`, `application`, `modernization`, `security`, `compute`, `storage`, `networking`, `container`, `serverless`, `ai`, `machine learning`, `analytics`, `data`, `api`, `microservices`

#### Customer-Specific Terms:

- Include customer name variations and abbreviations
- Add industry-specific terms from the opportunity

### 3. **Performance Optimizations**

#### Athena-Specific Optimizations:

1. **CTE Structure**: Use Common Table Expressions to avoid complex subqueries
2. **Date Filtering**: Efficient date range filtering with `from_unixtime()`
3. **String Operations**: Minimize string operations in WHERE clauses
4. **LIMIT Optimization**: Ensure proper LIMIT clause placement

#### AWS Best Practices Applied:

- **Distributed Processing**: Optimize for Athena's worker node distribution
- **Memory Efficiency**: Reduce memory usage with efficient field selection
- **Query Complexity**: Balance complexity with performance requirements

## Implementation Recommendations

### 1. **Immediate Actions**

#### Update the Current Prompt:

1. Replace the system instructions in your Bedrock prompt with the optimized version
2. Update the query structure to use the enhanced CTE pattern
3. Lower the relevance threshold from 30 to 15
4. Add recency sorting to the ORDER BY clause

#### File Updates Required:

- `updated-bedrock-query-prompt-complete.md` → Use the enhanced version
- `automations/enhancedBedrockQueryPrompt-v3.js` → Integrate optimization logic
- Bedrock Agent prompt resource → Update with new system instructions

### 2. **Enhanced Automation Integration**

#### New Automation Features:

- **Dynamic Threshold Adjustment**: Automatically adjust relevance threshold based on result count
- **Performance Monitoring**: Track query performance and optimization effectiveness
- **Fallback Logic**: Implement fallback queries if initial results are insufficient

#### Implementation Steps:

1. Deploy the enhanced automation (`enhancedBedrockQueryPrompt-optimized.js`)
2. Update the main application to use the optimized automation
3. Add performance monitoring and metrics collection

### 3. **Testing and Validation**

#### Test Scenarios:

1. **High-Complexity Opportunities**: Test with enterprise migration scenarios
2. **Low-Complexity Opportunities**: Test with simple SMB scenarios
3. **Regional Variations**: Test with different regional opportunities
4. **Industry-Specific**: Test with various industry types

#### Success Metrics:

- **Result Count**: Ensure 150-200 results consistently
- **Relevance Quality**: Maintain high relevance while increasing quantity
- **Performance**: Query execution time under 30 seconds
- **Accuracy**: Improved prediction accuracy in final analysis

## Expected Outcomes

### 1. **Quantitative Improvements**

- **Result Volume**: Increase from ~46 to 150-200 projects consistently
- **Query Performance**: 20-30% improvement in execution time
- **Relevance Coverage**: Broader range of relevant projects captured

### 2. **Qualitative Improvements**

- **Analysis Quality**: More comprehensive historical data for predictions
- **Prediction Accuracy**: Better ARR/MRR predictions with larger datasets
- **Risk Assessment**: More diverse risk factors identified

### 3. **Operational Benefits**

- **Reduced Timeouts**: Better query performance reduces timeout risks
- **Scalability**: Optimized queries handle larger datasets efficiently
- **Maintainability**: Cleaner, more maintainable query structure

## Implementation Timeline

### Phase 1: Immediate (1-2 days)

- Update Bedrock prompt with optimized system instructions
- Deploy enhanced automation with basic optimizations
- Test with current opportunity types

### Phase 2: Enhanced (3-5 days)

- Implement dynamic threshold adjustment
- Add comprehensive performance monitoring
- Deploy fallback query logic

### Phase 3: Advanced (1 week)

- Implement machine learning-based query optimization
- Add A/B testing for different query strategies
- Deploy advanced analytics and reporting

## Risk Mitigation

### 1. **Performance Risks**

- **Mitigation**: Implement query timeout handling and fallback queries
- **Monitoring**: Add real-time performance monitoring

### 2. **Quality Risks**

- **Mitigation**: Maintain relevance scoring while lowering thresholds
- **Validation**: Implement result quality validation

### 3. **Compatibility Risks**

- **Mitigation**: Ensure backward compatibility with existing systems
- **Testing**: Comprehensive testing across all opportunity types

## Conclusion

The optimized query strategy addresses the core issues while maintaining the quality of results. The key improvements are:

1. **Lower relevance threshold** (30 → 15) for broader result coverage
2. **Enhanced keyword matching** with semantic patterns
3. **Athena performance optimization** for better query execution
4. **Recency sorting** to prioritize recent, relevant projects
5. **Dynamic optimization** based on opportunity characteristics

This approach should significantly increase the number of results reaching the final Bedrock analysis while maintaining or improving the quality of predictions. The implementation can be done incrementally, starting with the prompt updates and gradually adding the enhanced automation features.

## Next Steps

1. **Review and approve** the optimized prompt structure
2. **Deploy the enhanced automation** with basic optimizations
3. **Test with current opportunities** to validate improvements
4. **Monitor performance metrics** and adjust as needed
5. **Implement advanced features** based on initial results

The goal is to achieve 150-200 high-quality results consistently while maintaining the accuracy and relevance of the final analysis.
