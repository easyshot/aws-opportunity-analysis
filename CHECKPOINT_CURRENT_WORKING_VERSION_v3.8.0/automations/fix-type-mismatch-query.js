/**
 * Quick Fix Automation: Fix TYPE_MISMATCH Error in SQL Queries
 * Purpose: Handle the annual_run_rate_usd type mismatch issue in generated queries
 */

/**
 * Fix TYPE_MISMATCH error in SQL query
 * @param {string} sqlQuery - The SQL query to fix
 * @returns {string} - Fixed SQL query
 */
function fixTypeMismatchError(sqlQuery) {
  try {
    console.log("🔧 Fixing TYPE_MISMATCH error in SQL query...");

    let fixedQuery = sqlQuery;

    // Fix 1: Handle annual_run_rate_usd formatting issue
    // The problem is that we're formatting annual_run_rate_usd as string but comparing as number

    // Pattern 1: Fix the base_projects CTE to keep numeric field
    fixedQuery = fixedQuery.replace(
      /FORMAT\('%,\.0f', annual_run_rate_usd\) AS annual_run_rate_usd,/g,
      "annual_run_rate_usd, FORMAT('%,.0f', annual_run_rate_usd) AS annual_run_rate_usd_formatted,"
    );

    // Pattern 2: Fix the final SELECT to use formatted version
    fixedQuery = fixedQuery.replace(
      /SELECT \* FROM scored_projects/g,
      `SELECT 
        activity_name,
        project_type,
        cor_gtm_apn_sfdc,
        program,
        "unified program mapping",
        customer_name,
        "aws account id",
        annual_run_rate_usd_formatted AS annual_run_rate_usd,
        aws_account_id_for_this_project,
        opportunity_18_character_oppty_id,
        apn_oppty_id,
        customer_segment,
        industry,
        close_date,
        planned_delivery_start_date,
        planned_delivery_end_date,
        migration_phase,
        opportunity_region,
        "oppertunity-sub-region",
        country,
        opportunity_name,
        description,
        business_description,
        partner_name,
        spms_id,
        apfp_aws_calculator_url,
        calculator_uid,
        service1, "monthly $ service1", "upfront $ service1",
        service2, "monthly $ service2", "upfront $ service2",
        service3, "monthly $ service3", "upfront $ service3",
        service4, "monthly $ service4", "upfront $ service4",
        service5, "monthly $ service5", "upfront $ service5",
        service6, "monthly $ service6", "upfront $ service6",
        service7, "monthly $ service7", "upfront $ service7",
        service8, "monthly $ service8", "upfront $ service8",
        service9, "monthly $ service9", "upfront $ service9",
        servicex, "monthly $ servicex", "upfront $ servicex",
        relevance_score
      FROM scored_projects`
    );

    // Pattern 3: Ensure annual_run_rate_usd comparisons use numeric field
    // This should already be correct since we're keeping the numeric field in base_projects

    // Pattern 4: Fix any remaining formatting issues
    fixedQuery = fixedQuery.replace(
      /annual_run_rate_usd_formatted AS annual_run_rate_usd_formatted/g,
      "annual_run_rate_usd_formatted AS annual_run_rate_usd"
    );

    console.log("✅ TYPE_MISMATCH fix applied successfully");
    return fixedQuery;
  } catch (error) {
    console.error("❌ Error fixing TYPE_MISMATCH:", error);
    return sqlQuery; // Return original if fix fails
  }
}

/**
 * Validate SQL query for type mismatches
 * @param {string} sqlQuery - The SQL query to validate
 * @returns {boolean} - True if query is valid, false if issues found
 */
function validateQueryForTypeMismatch(sqlQuery) {
  try {
    const issues = [];

    // Check for common type mismatch patterns
    if (
      sqlQuery.includes(
        "FORMAT('%,.0f', annual_run_rate_usd) AS annual_run_rate_usd"
      )
    ) {
      issues.push(
        "annual_run_rate_usd formatted as string but used in numeric comparisons"
      );
    }

    if (
      sqlQuery.includes("annual_run_rate_usd > 100000") &&
      sqlQuery.includes("FORMAT")
    ) {
      issues.push(
        "Potential type mismatch: comparing formatted string with numbers"
      );
    }

    if (issues.length > 0) {
      console.warn("⚠️ Potential type mismatch issues found:", issues);
      return false;
    }

    console.log(
      "✅ Query validation passed - no type mismatch issues detected"
    );
    return true;
  } catch (error) {
    console.error("❌ Error validating query:", error);
    return false;
  }
}

/**
 * Main function to process and fix SQL queries
 * @param {string} sqlQuery - The SQL query to process
 * @returns {string} - Fixed SQL query
 */
function processAndFixQuery(sqlQuery) {
  try {
    console.log("🔍 Processing SQL query for type mismatch issues...");

    // First validate the query
    const isValid = validateQueryForTypeMismatch(sqlQuery);

    if (!isValid) {
      console.log("🔧 Applying type mismatch fixes...");
      return fixTypeMismatchError(sqlQuery);
    }

    return sqlQuery;
  } catch (error) {
    console.error("❌ Error processing query:", error);
    return sqlQuery;
  }
}

module.exports = {
  fixTypeMismatchError,
  validateQueryForTypeMismatch,
  processAndFixQuery,
};
