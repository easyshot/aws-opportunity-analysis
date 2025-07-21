\# Project Handover Document

\*\*Document Version\*\*: Reflecting state as of May 27, 2025 (incorporating Nova Premier testing, conditional date logic, and subsequent script/prompt refinements).  
\*\*Previous Version\*\*: May 26, 2025 (Notionally V0.3.4.0)

This document outlines the components, configurations, automations, and prompts used in the AWS App Studio application.

\#\# Table of Contents  
1\.  UI Components  
    \* 1.1. Button: \`oppDetQueryButtonV3\` (Production)  
    \* 1.2. Button: \`oppDetQueryButtonV4\` (Test for Nova Premier)  
    \* 1.3. UI Actions  
2\.  Automations  
    \* 2.1. Automation: \`invokeBedrockQueryPrompt\`  
    \* 2.2. Automation: \`InvLamFilterAut\`  
    \* 2.3. Automation: \`finalBedAnalysisPrompt\` (Production/Original)  
    \* 2.4. Automation: \`finalBedAnalysisPromptNovaPremier\` (Test for Nova Premier)  
    \* 2.5. Automation: \`invokeBedrockQuery\` (Legacy/Alternative)  
3\.  Bedrock Prompt Details  
    \* 3.1. Prompt Name: "CatapultQueryPrompt"  
    \* 3.2. Prompt Name: "CatapultAnalysisPrompt" (Original for \`finalBedAnalysisPrompt\`)  
    \* 3.3. Prompt Name: "CatapultAnalysisPrompt\_NovaPremier" (for \`finalBedAnalysisPromptNovaPremier\`)  
4\.  Lambda Functions  
    \* 4.1. Lambda Function: \`catapult\_get\_dataset\`  
5\.  General Configurations & Parameters  
6\.  Release Notes  
7\.  Coding Partner (AI Assistant) Collaboration Guidelines

\---

\#\# 1\. UI Components

\#\#\# 1.1. Button: \`oppDetQueryButtonV3\` (Production)  
\* \*\*Purpose\*\*: Main user interaction point to start the opportunity analysis process using the production analysis flow.  
\* \*\*Triggers (Initial UI Clear Actions)\*\*:  
    \* \`RunComClearARR\`  
    \* \`RunComClearMrr\`  
    \* \`RunComClearDate\`  
    \* \`RunComClearLaunch\` (Note: UI element might be deprecated if \`TIME\_TO\_LAUNCH\` metric is fully removed from UI display)  
\* \*\*Triggers (Sequential Automations after Clears)\*\*:  
    1\.  \`invokeBedrockQueryPrompt\` automation.  
    2\.  \`InvLamFilterAut\` automation (Input: \`{{results.InvBedQueryPrompt.sql\_query}}\` or \`{{results.InvBedQueryPrompt.processResults}}\` depending on actual output variable name of \`invokeBedrockQueryPrompt\` that contains the stringified JSON \`{"sql\_query": "..."}\`).  
    3\.  \`finalBedAnalysisPrompt\` automation (Input: \`{{results.InvLamFilterAut.processResults}}\` for \`queryResults\` and other UI params).  
\* \*\*Triggers (UI Population Actions after \`finalBedAnalysisPrompt\` Completes \- using \`InvAutBedFinalAnalysis\` as the result name for this automation call)\*\*:  
    \* \`RunComSetArr\`: Sets \`oppArrOut\` UI field with \`{{results.InvAutBedFinalAnalysis.metrics.predictedArr}}\`.  
    \* \`RunComSetMrr\`: Sets \`oppMrrOut\` UI field with \`{{results.InvAutBedFinalAnalysis.metrics.predictedMrr}}\`.  
    \* \`RunComSetDate\`: Sets \`oppLaunchDateOut\` UI field with \`{{results.InvAutBedFinalAnalysis.metrics.launchDate}}\`.  
    \* \`RunComSetMetricDuration\`: Sets UI field for predicted project duration with \`{{results.InvAutBedFinalAnalysis.metrics.predictedProjectDuration}}\`.  
    \* \`RunComSetConfidence\`: Sets UI field for confidence with \`{{results.InvAutBedFinalAnalysis.metrics.confidence}}\`.  
    \* \`RunComSetServices2\`: Sets UI field for top services with \`{{results.InvAutBedFinalAnalysis.metrics.topServices}}\`.  
    \* \`RunComSetSim\`: Sets \`similarProjectsArea\` UI component's value to \`{{results.InvAutBedFinalAnalysis.sections.similarProjectsRaw}}\`.  
    \* \`RunComSetFull\`: Sets UI field for full analysis/summary text, e.g., \`textSummary\`, with \`{{results.InvAutBedFinalAnalysis.formattedSummaryText}}\`.

\#\#\# 1.2. Button: \`oppDetQueryButtonV4\` (Test for Nova Premier)  
\* \*\*Purpose\*\*: Test button to trigger the analysis flow using the \`finalBedAnalysisPromptNovaPremier\` automation (which uses the "Amazon Nova Premier" model and updated logic).  
\* \*\*Triggers (Initial UI Clear Actions)\*\*:  
    \* (Same as \`oppDetQueryButtonV3\`: \`RunComClearARR\`, \`RunComClearMrr\`, \`RunComClearDate\`, \`RunComClearLaunch\`)  
\* \*\*Triggers (Sequential Automations after Clears)\*\*:  
    1\.  \`invokeBedrockQueryPrompt\` automation (to generate SQL).  
    2\.  \`InvLamFilterAut\` automation (Input: \`{{results.InvBedQueryPrompt.processResults}}\` for \`query\`).  
    3\.  \`finalBedAnalysisPromptNovaPremier\` automation (Input: \`{{results.InvLamFilterAut.processResults}}\` for \`queryResults\` and other UI params like \`CustomerName\`, \`region\`, etc.).  
\* \*\*Triggers (UI Population Actions after \`finalBedAnalysisPromptNovaPremier\` Completes \- using \`InvAutBedFinalAnalysisNP\` as the result name for this automation call)\*\*:  
    \* (Similar to \`oppDetQueryButtonV3\`, but using results from \`InvAutBedFinalAnalysisNP\`):  
        \* \`RunComSetArr\`: \`{{results.InvAutBedFinalAnalysisNP.metrics.predictedArr}}\`  
        \* \`RunComSetMrr\`: \`{{results.InvAutBedFinalAnalysisNP.metrics.predictedMrr}}\`  
        \* \`RunComSetDate\`: \`{{results.InvAutBedFinalAnalysisNP.metrics.launchDate}}\`  
        \* \`RunComSetMetricDuration\`: \`{{results.InvAutBedFinalAnalysisNP.metrics.predictedProjectDuration}}\`  
        \* \`RunComSetConfidence\`: \`{{results.InvAutBedFinalAnalysisNP.metrics.confidence}}\`  
        \* \`RunComSetServices2\`: \`{{results.InvAutBedFinalAnalysisNP.metrics.topServices}}\`  
        \* \`RunComSetSim\`: \`{{results.InvAutBedFinalAnalysisNP.sections.similarProjectsRaw}}\`  
        \* \`RunComSetFull\`: \`{{results.InvAutBedFinalAnalysisNP.formattedSummaryText}}\`  
\* \*\*Action Configuration for \`Invoke Automation\` step calling \`finalBedAnalysisPromptNovaPremier\` (named \`InvAutBedFinalAnalysisNP\` in the button's event chain)\*\*:  
    \* \*\*Automation\*\*: \`finalBedAnalysisPromptNovaPremier\`  
    \* \*\*Parameters\*\*:  
        \* \`CustomerName\`: \`{{ui.CustomerName.value}}\`  
        \* \`region\`: \`{{ui.region.value}}\`  
        \* \`closeDate\`: \`{{ui.closeDate.value}}\`  
        \* \`oppName\`: \`{{ui.oppName.value}}\`  
        \* \`oppDescription\`: \`{{ui.oppDescription.value}}\`  
        \* \`queryResults\`: \`{{results.InvLamFilterAut.processResults}}\` (output from the preceding Lambda invocation automation)

\#\#\# 1.3. UI Actions  
\* \`RunComClearARR\`: Clears the \`oppArrOut\` UI field.  
\* \`RunComClearMrr\`: Clears the \`oppMrrOut\` UI field.  
\* \`RunComClearDate\`: Clears the \`oppLaunchDateOut\` UI field.  
\* \`RunComClearLaunch\`: Clears an output UI field (e.g., \`oppTimeToLaunchOut\`).  
    \*(Population actions are listed under respective button triggers)\*

\---

\#\# 2\. Automations

\#\#\# 2.1. Automation: \`invokeBedrockQueryPrompt\`  
\* \*\*Purpose\*\*: Orchestrates SQL query generation using a fetched Bedrock Prompt Resource ("CatapultQueryPrompt") and the Bedrock Converse API.  
\* \*\*Status\*\*: Stable and Working.  
\* \*\*Input Parameters\*\*:  
    \* \`CustomerName\` (String | Required)  
    \* \`region\` (String | Required)  
    \* \`closeDate\` (String | Required)  
    \* \`oppName\` (String | Required)  
    \* \`oppDescription\` (String | Required)  
\* \*\*Output\*\*: \`{{results.processResults}}\` (Stringified JSON: \`{"sql\_query": "..."}\`)  
\* \*\*Actions within \`invokeBedrockQueryPrompt\`\*\*:  
    \* \*\*Action Name: \`WorkspacePrompt\`\*\* (or similar, e.g., \`FetchCatapultQueryPrompt\`)  
        \* \*\*Type/Resource:\*\* Bedrock Agent GetPrompt  
        \* \*\*Configuration:\*\* Fetches the Bedrock Prompt resource "CatapultQueryPrompt" (ID \`Y6T66EI3GZ\`).  
    \* \*\*Action Name: \`preparePayload\`\*\*  
        \* \*\*Type/Resource:\*\* JavaScript  
        \* \*\*Input:\*\* \`params\` (automation input parameters), \`results.WorkspacePrompt\` (output from GetPrompt)  
        \* \*\*Source Code:\*\* (As per V0.3.3.0 in original document \- this script prepares payload for Converse API, separating system and user messages)  
            \`\`\`javascript  
            const preparePayload \= (params, results) \=\> {  
              try {  
                const promptData \= results.WorkspacePrompt; // Ensure this matches the GetPrompt step output name  
                const modelId \= promptData.variants\[0\].modelId;  
                const userMessageTemplate \= promptData.variants\[0\].templateConfiguration.chat.messages\[0\].content\[0\].text;  
                const systemInstructions \= promptData.variants\[0\].templateConfiguration.chat.system\[0\].text;

                const filledUserMessage \= userMessageTemplate  
                  .replace('{{CustomerName}}', params.CustomerName || 'Not specified')  
                  .replace('{{region}}', params.region || 'Not specified')  
                  .replace('{{closeDate}}', params.closeDate || 'Not specified')  
                  .replace('{{oppName}}', params.oppName || 'Not specified')  
                  .replace('{{oppDescription}}', params.oppDescription || 'Not specified');

                return {  
                  modelId: modelId,  
                  system: \[{ text: systemInstructions }\],  
                  messages: \[  
                    {  
                      role: "user",  
                      content: \[{ text: filledUserMessage }\]  
                    }  
                  \],  
                  inferenceConfig: {   
                    maxTokens: 4096,   
                    temperature: 0.0   
                  }  
                };  
              } catch (error) {  
                console.error('Critical error in preparePayload for invokeBedrockQueryPrompt:', error.message, error.stack);  
                throw new Error('Failed to prepare Bedrock payload for SQL query: ' \+ error.message);  
              }  
            };  
            return preparePayload(params, results);  
            \`\`\`  
    \* \*\*Action Name: \`InvokeBedQuery\`\*\* (or similar)  
        \* \*\*Type/Resource:\*\* Bedrock Runtime Converse  
        \* \*\*Input:\*\* Payload from \`preparePayload\` action.  
        \* \*\*Model ID:\*\* Derived from the fetched prompt in \`preparePayload\`.  
    \* \*\*Action Name: \`processResults\`\*\*  
        \* \*\*Type/Resource:\*\* JavaScript  
        \* \*\*Input:\*\* \`results.InvokeBedQuery\`  
        \* \*\*Source Code:\*\* (As per V0.3.3.0 in original document \- this script extracts the JSON \`{"sql\_query": "..."}\` from the Converse API response)  
            \`\`\`javascript  
            function processConverseApiResponse(response) {  
              console.log("PROCESS\_RESULTS (SQL Query): Starting. Input response object (first 1000 chars):", JSON.stringify(response, null, 2).substring(0,1000));  
              if (\!response || \!response.output || \!response.output.message || \!response.output.message.content || \!response.output.message.content\[0\] || \!response.output.message.content\[0\].text) {  
                console.error("PROCESS\_RESULTS (SQL Query): Invalid or incomplete Bedrock Converse API response structure. Full response:", JSON.stringify(response, null, 2));  
                throw new Error("Invalid or incomplete Bedrock Converse API response structure for SQL query generation.");  
              }  
              const messageContentText \= response.output.message.content\[0\].text;  
              console.log("PROCESS\_RESULTS (SQL Query): Extracted message content (should be a JSON string):", messageContentText);  
              try {  
                const parsedJson \= JSON.parse(messageContentText);  
                if (parsedJson && typeof parsedJson.sql\_query \=== 'string') {  
                  console.log("PROCESS\_RESULTS (SQL Query): Successfully extracted SQL query from JSON within message content:", parsedJson.sql\_query);  
                  return JSON.stringify(parsedJson);   
                } else {  
                  console.error("PROCESS\_RESULTS (SQL Query): Parsed JSON does not contain a 'sql\_query' string property. Parsed JSON:", JSON.stringify(parsedJson, null, 2));  
                  throw new Error("Parsed JSON from LLM response does not contain a 'sql\_query' string property.");  
                }  
              } catch (error) {  
                console.error("PROCESS\_RESULTS (SQL Query): Error parsing message content as JSON or extracting sql\_query. Error:", error.message, ". Message content was:", messageContentText);  
                const jsonMatch \= messageContentText.match(/{\[\\s\\S\]\*}/);  
                if (jsonMatch && jsonMatch\[0\]) {  
                  try {  
                    const embeddedParsedJson \= JSON.parse(jsonMatch\[0\]);  
                    if (embeddedParsedJson && typeof embeddedParsedJson.sql\_query \=== 'string') {  
                      console.warn("PROCESS\_RESULTS (SQL Query): Fallback \- Successfully extracted SQL query from JSON embedded in text:", embeddedParsedJson.sql\_query);  
                      return JSON.stringify(embeddedParsedJson);  
                    }  
                  } catch (fallbackError) {  
                    console.error("PROCESS\_RESULTS (SQL Query): Fallback parsing also failed. Error:", fallbackError.message);  
                  }  
                }  
                throw new Error("Failed to extract a valid SQL query from the LLM's response. Response was not the expected clean JSON object: " \+ messageContentText.substring(0, 200\) \+ "...");  
              }  
            }  
            return processConverseApiResponse(results.InvokeBedQuery);  
            \`\`\`

\#\#\# 2.2. Automation: \`InvLamFilterAut\`  
\* \*\*Purpose\*\*: Executes the generated SQL query against Athena via the \`catapult\_get\_dataset\` Lambda function.  
\* \*\*Status\*\*: Stable and Working.  
\* \*\*Input Parameters\*\*:  
    \* \`query\` (String | Required) \- Expects stringified JSON like \`{"sql\_query":"SELECT..."}\`.  
\* \*\*Output\*\*: \`{{results.processResults}}\` (Stringified JSON containing status and data from Athena).  
\* \*\*Actions within \`InvLamFilterAut\`\*\*:  
    \* \*\*Action Name: \`preparePayload\`\*\*  
        \* \*\*Type/Resource\*\*: JavaScript  
        \* \*\*Source Code:\*\* (As per V0.3.3.0 in original document)  
            \`\`\`javascript  
            console.log('Starting preparePayload action in InvLamFilterAut');  
            console.log('Incoming query parameter:', params.query);  
            try {  
              let queryData;  
              try {  
                queryData \= typeof params.query \=== 'string' ? JSON.parse(params.query) : params.query;  
              } catch (e) {  
                console.error('Error parsing query parameter in InvLamFilterAut:', e);  
                throw new Error('Invalid query format for InvLamFilterAut');  
              }  
              console.log('Parsed queryData in InvLamFilterAut:', queryData);  
              if (\!queryData || typeof queryData \!== 'object' || \!('sql\_query' in queryData)) {  
                throw new Error('Missing or invalid sql\_query in query data for InvLamFilterAut');  
              }  
              const formattedQuery \= {  
                sql\_query: queryData.sql\_query  
              };  
              console.log('Formatted query for Lambda in InvLamFilterAut:', formattedQuery);  
              return JSON.stringify(formattedQuery);  
            } catch (error) {  
              console.error('Error in preparePayload for InvLamFilterAut:', error);  
              throw error;  
            }  
            \`\`\`  
    \* \*\*Action Name: \`InvLamFilterAct\`\*\*  
        \* \*\*Type/Resource\*\*: Invoke Lambda function  
        \* \*\*Function Name\*\*: \`catapult\_get\_dataset\`  
    \* \*\*Action Name: \`processResults\`\*\*  
        \* \*\*Type/Resource\*\*: JavaScript  
        \* \*\*Source Code:\*\* (As per V0.3.3.0 in original document \- processes Athena results)  
            \`\`\`javascript  
            function processResults(response) {  
              console.log('Processing Lambda results in InvLamFilterAut:', response);  
              try {  
                if (\!response) {  
                  console.error('No response received from Lambda in InvLamFilterAut');  
                  return JSON.stringify({ status: 'error', message: 'No response received from Lambda', data: \[\] }, null, 2);  
                }  
                let resultSet;  
                if (response.body) {  
                    const parsedBody \= typeof response.body \=== 'string' ? JSON.parse(response.body) : response.body;  
                    if (parsedBody.ResultSet) {  
                        resultSet \= parsedBody.ResultSet;  
                        console.log('Parsed ResultSet in InvLamFilterAut:', resultSet);  
                    } else if (parsedBody.data && Array.isArray(parsedBody.data) && parsedBody.status) {  
                        console.log('Lambda returned pre-formatted data in InvLamFilterAut:', parsedBody);  
                        return JSON.stringify(parsedBody, null, 2);  
                    }  
                    else {  
                        console.error('No ResultSet found in response body, and not pre-formatted. Body in InvLamFilterAut:', parsedBody);  
                        return JSON.stringify({ status: 'error', message: 'No ResultSet found in response and not pre-formatted', data: \[\] }, null, 2);  
                    }  
                } else {  
                     console.error('No response.body from Lambda. Full response in InvLamFilterAut:', response);  
                    return JSON.stringify({ status: 'error', message: 'No response.body from Lambda.', data: \[\] }, null, 2);  
                }  
                if (\!resultSet || \!resultSet.Rows || resultSet.Rows.length \=== 0\) {  
                  return JSON.stringify({ status: 'success', message: 'No results found', data: \[\] }, null, 2);  
                }  
                const headers \= resultSet.Rows\[0\].Data.map(col \=\> col.VarCharValue);  
                console.log('Extracted headers in InvLamFilterAut:', headers);  
                const data \= resultSet.Rows.slice(1).map(row \=\> {  
                  const rowObj \= {};  
                  headers.forEach((header, index) \=\> {  
                    rowObj\[header\] \= row.Data\[index\]?.VarCharValue || '';  
                  });  
                  return rowObj;  
                });  
                console.log('Transformed data in InvLamFilterAut (first 2 items):', data.slice(0,2));  
                const results \= {  
                  status: 'success',  
                  message: \`Found ${data.length} results\`,  
                  data: data  
                };  
                return JSON.stringify(results, null, 2);  
              } catch (error) {  
                console.error('Error processing results in InvLamFilterAut:', error);  
                return JSON.stringify({ status: 'error', message: \`Error processing results: ${error.message}\`, data: \[\] }, null, 2);  
              }  
            }  
            return processResults(results.InvLamFilterAct);  
            \`\`\`

\#\#\# 2.3. Automation: \`finalBedAnalysisPrompt\` (Production/Original)  
\* \*\*Purpose\*\*: Orchestrates the final analysis generation using the "CatapultAnalysisPrompt" Bedrock prompt (original version).  
\* \*\*Status\*\*: Production.  
\* \*\*Input Parameters\*\*:  
    \* \`CustomerName\` (String | Required)  
    \* \`region\` (String | Required)  
    \* \`closeDate\` (String | Required)  
    \* \`oppName\` (String | Required)  
    \* \`oppDescription\` (String | Required)  
    \* \`queryResults\` (String | Required) \- Stringified JSON array of historical project data.  
\* \*\*Output\*\*: \`{{results.processAnalysisResults}}\` (JSON object).  
\* \*\*Actions within \`finalBedAnalysisPrompt\`\*\*:  
    \* \*\*Action Name: \`WorkspaceCatapultAnalysisPrompt\`\*\*  
        \* \*\*Type/Resource\*\*: Bedrock Agent GetPrompt  
        \* \*\*Configuration\*\*: Fetches "CatapultAnalysisPrompt" (ID \`FDUHITJIME\`).  
    \* \*\*Action Name: \`prepareAnalysisPayload\`\*\*  
        \* \*\*Type/Resource\*\*: JavaScript  
        \* \*\*Source Code:\*\* (As per V0.3.4.0 in original document \- handles \`historical\_opportunity\_won\_date\` from 10-digit timestamps and removes \`currentDateString\` logic for LLM).  
            \`\`\`javascript  
            function prepareConverseApiPayload(params, fetchedPromptData) {  
              let systemPromptText \= "";  
              let userPromptTemplateText \= "";  
              let modelId \= "";  
              if (fetchedPromptData && fetchedPromptData.variants && fetchedPromptData.variants\[0\]) {  
                modelId \= fetchedPromptData.variants\[0\].modelId;  
                if (fetchedPromptData.variants\[0\].templateConfiguration && fetchedPromptData.variants\[0\].templateConfiguration.chat) {  
                  const chatConfig \= fetchedPromptData.variants\[0\].templateConfiguration.chat;  
                  if (chatConfig.system && chatConfig.system\[0\] && chatConfig.system\[0\].text) {  
                    systemPromptText \= chatConfig.system\[0\].text;  
                  }  
                  if (chatConfig.messages && chatConfig.messages\[0\] && chatConfig.messages\[0\].role \=== 'user' && chatConfig.messages\[0\].content && chatConfig.messages\[0\].content\[0\] && chatConfig.messages\[0\].content\[0\].text) {  
                    userPromptTemplateText \= chatConfig.messages\[0\].content\[0\].text;  
                  }  
                }  
              }  
              if (\!modelId) { throw new Error("Model ID could not be extracted"); }  
              if (\!systemPromptText && \!userPromptTemplateText) { console.warn("System or User prompt template missing"); }

              let processedUserPrompt \= userPromptTemplateText;  
              const closeDatePlaceholder \= "{CloseDate\_placeholder\_for\_rule\_reference\_only}";  
              processedUserPrompt \= processedUserPrompt.replace(new RegExp(closeDatePlaceholder.replace(/\[.\*+?^${}()|\[\\\]\\\\\]/g, '\\\\$&'), 'g'), params.closeDate || 'N/A');

              const newOppDetails \= \`\<opp\_details\>\\n\` \+  
                \`CustomerName: ${params.CustomerName || 'N/A'}\\n\` \+  
                \`Region: ${params.region || 'N/A'}\\n\` \+  
                \`CloseDate: ${params.closeDate || 'N/A'}\\n\` \+  
                \`OppName: ${params.oppName || 'N/A'}\\n\` \+  
                \`OppDescription: ${params.oppDescription || 'N/A'}\\n\` \+  
                \`\</opp\_details\>\`;

              let historicalDataArrayForLlm \= \[\];  
              if (params.queryResults) {  
                try {  
                  const parsedQueryResults \= JSON.parse(params.queryResults);  
                  if (parsedQueryResults && Array.isArray(parsedQueryResults.data)) {  
                    historicalDataArrayForLlm \= parsedQueryResults.data.map(project \=\> {  
                      const projectForLlm \= { ...project };  
                      let formattedWonDate \= 'N/A';  
                      // This version of the script only handles 10-digit numeric timestamps for close\_date  
                      if (projectForLlm.close\_date && typeof projectForLlm.close\_date \=== 'number' && String(projectForLlm.close\_date).length \=== 10\) {  
                        try {  
                          const dateObj \= new Date(projectForLlm.close\_date \* 1000);  
                          const year \= dateObj.getUTCFullYear();  
                          const month \= String(dateObj.getUTCMonth() \+ 1).padStart(2, '0');  
                          const day \= String(dateObj.getUTCDate()).padStart(2, '0');  
                          formattedWonDate \= \`${year}-${month}-${day}\`;  
                        } catch (e) { console.warn(\`Error converting close\_date ${projectForLlm.close\_date}\`); }  
                      } else if (projectForLlm.close\_date) {  
                        console.warn(\`Project ${projectForLlm.opportunity\_name || projectForLlm.activity\_name} has close\_date '${projectForLlm.close\_date}' not a 10-digit number. historical\_opportunity\_won\_date will be 'N/A'.\`);  
                      }  
                      projectForLlm.historical\_opportunity\_won\_date \= formattedWonDate;  
                      delete projectForLlm.close\_date;  
                      return projectForLlm;  
                    });  
                  } else { console.warn("params.queryResults.data is not an array or is missing.");}  
                } catch (e) { console.error("Error parsing queryResults or processing close\_date:", e); }  
              }  
              const historicalDataStringForLlm \= JSON.stringify(historicalDataArrayForLlm);  
              const historicalDataForLlm \= \`\<project\_data\>\\n${historicalDataStringForLlm}\\n\</project\_data\>\`;  
              const userMessageContent \= \`${newOppDetails}\\n\\n${historicalDataForLlm}\\n\\n${processedUserPrompt}\`;  
              const messages \= \[{ role: "user", content: \[{ text: userMessageContent }\] }\];  
              let payload;  
              if (systemPromptText && systemPromptText.trim() \!== "") {  
                payload \= { modelId, messages, system: \[{ text: systemPromptText }\], inferenceConfig: { maxTokens: 10000, temperature: 0.0 } };  
              } else {  
                payload \= { modelId, messages, inferenceConfig: { maxTokens: 10000, temperature: 0.0 } };  
              }  
              return payload;  
            }  
            if (\!results.WorkspaceCatapultAnalysisPrompt) { throw new Error("GetPrompt action output missing."); }  
            return prepareConverseApiPayload(params, results.WorkspaceCatapultAnalysisPrompt);  
            \`\`\`  
    \* \*\*Action Name: \`invokeNovaProAnalysis\`\*\* (or similar name for Bedrock Converse)  
        \* \*\*Type/Resource\*\*: Bedrock Runtime Converse  
    \* \*\*Action Name: \`processAnalysisResults\`\*\*  
        \* \*\*Type/Resource\*\*: JavaScript  
        \* \*\*Source Code:\*\* (As per V0.3.4.0 in original document \- includes parsing for \`PREDICTED\_PROJECT\_DURATION\`).

\#\#\# 2.4. Automation: \`finalBedAnalysisPromptNovaPremier\` (Test for Nova Premier)  
\* \*\*Purpose\*\*: Orchestrates the final analysis generation using "Amazon Nova Premier" model via the "CatapultAnalysisPrompt\_NovaPremier" Bedrock prompt. Implements robust date parsing and conditional logic for \`historical\_opportunity\_won\_date\`.  
\* \*\*Status\*\*: Actively being tested and refined.  
\* \*\*Input Parameters\*\*:  
    \* \`CustomerName\` (String | Required)  
    \* \`region\` (String | Required)  
    \* \`closeDate\` (String | Required) \- New opportunity's close date.  
    \* \`oppName\` (String | Required)  
    \* \`oppDescription\` (String | Required)  
    \* \`queryResults\` (String | Required) \- Stringified JSON array of historical project data.  
\* \*\*Output\*\*: \`{{results.processAnalysisResults}}\` (JSON object).  
\* \*\*Actions within \`finalBedAnalysisPromptNovaPremier\`\*\*:  
    \* \*\*Action Name: \`CatapultAnalysisPromptNP\`\*\* (or similar, e.g., \`FetchNovaPremierAnalysisPrompt\`)  
        \* \*\*Type/Resource\*\*: Bedrock Agent GetPrompt  
        \* \*\*Configuration\*\*: Fetches the Bedrock Prompt resource "CatapultAnalysisPrompt\_NovaPremier" (e.g., ARN \`arn:aws:bedrock:us-east-1:701976266286:prompt/P03B9TO1Q1\` as per chat, or the actual ARN/ID of the prompt configured for Nova Premier).  
    \* \*\*Action Name: \`prepareAnalysisPayload\`\*\*  
        \* \*\*Type/Resource\*\*: JavaScript  
        \* \*\*Input\*\*: \`params\`, \`results.CatapultAnalysisPromptNP\`  
        \* \*\*Source Code (Latest version with robust date parsing and conditional logic for \`historical\_opportunity\_won\_date\`):\*\*  
            \`\`\`javascript  
            function prepareConverseApiPayload(params, fetchedPromptData) {  
                function parseYYYYMMDDToDate(dateStr) {  
                    if (\!dateStr || typeof dateStr \!== 'string' || dateStr.toLowerCase() \=== 'n/a') return null;  
                    let dateObj \= null;  
                    if (dateStr.match(/^\\d{4}-\\d{2}-\\d{2}$/)) {  
                        dateObj \= new Date(dateStr \+ "T00:00:00Z");  
                    }  
                    return (dateObj && \!isNaN(dateObj.getTime())) ? dateObj : null;  
                }

                let systemPromptText \= "";  
                let userPromptTemplateText \= "";  
                let modelId \= "";

                if (fetchedPromptData && fetchedPromptData.variants && fetchedPromptData.variants\[0\]) {  
                    modelId \= fetchedPromptData.variants\[0\].modelId;  
                    if (fetchedPromptData.variants\[0\].templateConfiguration && fetchedPromptData.variants\[0\].templateConfiguration.chat) {  
                        const chatConfig \= fetchedPromptData.variants\[0\].templateConfiguration.chat;  
                        if (chatConfig.system && chatConfig.system\[0\] && chatConfig.system\[0\].text) {  
                            systemPromptText \= chatConfig.system\[0\].text;  
                        }  
                        if (chatConfig.messages && chatConfig.messages\[0\] && chatConfig.messages\[0\].role \=== 'user' && chatConfig.messages\[0\].content && chatConfig.messages\[0\].content\[0\] && chatConfig.messages\[0\].content\[0\].text) {  
                            userPromptTemplateText \= chatConfig.messages\[0\].content\[0\].text;  
                        }  
                    }  
                }

                if (\!modelId) {  
                    const errorMessage \= "Model ID could not be extracted from fetched prompt data";  
                    console.error("prepareAnalysisPayload Error:", errorMessage);  
                    throw new Error(errorMessage);  
                }  
                if (\!systemPromptText && \!userPromptTemplateText) { console.warn("prepareAnalysisPayload Warning: Both System and User prompt templates could not be extracted or are empty."); }

                let processedUserPrompt \= userPromptTemplateText;  
                const closeDatePlaceholder \= "{CloseDate\_placeholder\_for\_rule\_reference\_only}";  
                processedUserPrompt \= processedUserPrompt.replace(new RegExp(closeDatePlaceholder.replace(/\[.\*+?^${}()|\[\\\]\\\\\]/g, '\\\\$&'), 'g'), params.closeDate || 'N/A');

                const newOppDetails \= \`\<opp\_details\>\\n\` \+  
                    \`CustomerName: ${params.CustomerName || 'N/A'}\\n\` \+  
                    \`Region: ${params.region || 'N/A'}\\n\` \+  
                    \`CloseDate: ${params.closeDate || 'N/A'}\\n\` \+  
                    \`OppName: ${params.oppName || 'N/A'}\\n\` \+  
                    \`OppDescription: ${params.oppDescription || 'N/A'}\\n\` \+  
                    \`\</opp\_details\>\`;

                let historicalDataArrayForLlm \= \[\];  
                if (params.queryResults) {  
                    try {  
                        const parsedQueryResults \= JSON.parse(params.queryResults);  
                        if (parsedQueryResults && Array.isArray(parsedQueryResults.data)) {  
                            historicalDataArrayForLlm \= parsedQueryResults.data.map(project \=\> {  
                                const projectForLlm \= { ...project };  
                                const projectNameForLog \= projectForLlm.opportunity\_name || projectForLlm.activity\_name || 'Unknown Historical Project';  
                                  
                                let formattedWonDate \= 'N/A';  
                                let closeDateObjForComparison \= null;

                                if (projectForLlm.hasOwnProperty('close\_date') && projectForLlm.close\_date \!== null && projectForLlm.close\_date \!== undefined && String(projectForLlm.close\_date).trim() \!== "") {  
                                    let timestampToProcessMs;  
                                    const closeDateVal \= projectForLlm.close\_date;  
                                    const closeDateType \= typeof closeDateVal;

                                    if (closeDateType \=== 'string') {  
                                        const trimmedCloseDateVal \= closeDateVal.trim();  
                                        if (trimmedCloseDateVal.length \=== 19 && /^\\d+$/.test(trimmedCloseDateVal)) { // Nanoseconds string  
                                            try { timestampToProcessMs \= parseInt(trimmedCloseDateVal.substring(0, 13)); if (isNaN(timestampToProcessMs)) { timestampToProcessMs \= null;}} catch (e) { timestampToProcessMs \= null; }  
                                        } else if (trimmedCloseDateVal.length \=== 10 && /^\\d+$/.test(trimmedCloseDateVal)) { // Seconds string  
                                            try { timestampToProcessMs \= parseInt(trimmedCloseDateVal) \* 1000; } catch (e) { timestampToProcessMs \= null; }  
                                        } else if (trimmedCloseDateVal.length \=== 13 && /^\\d+$/.test(trimmedCloseDateVal)) { // Milliseconds string  
                                            try { timestampToProcessMs \= parseInt(trimmedCloseDateVal); } catch (e) { timestampToProcessMs \= null; }  
                                        } else { console.warn(\`prepareAnalysisPayload: Hist. project '${projectNameForLog}' unhandled string close\_date='${trimmedCloseDateVal}'.\`); }  
                                    } else if (closeDateType \=== 'number') {  
                                        const numStr \= String(closeDateVal);  
                                        if (numStr.length \=== 10\) { timestampToProcessMs \= closeDateVal \* 1000; }  
                                        else if (numStr.length \=== 13\) { timestampToProcessMs \= closeDateVal; }  
                                        else if (numStr.length \=== 19\) { timestampToProcessMs \= Math.floor(closeDateVal / 1000000); }  
                                        else { console.warn(\`prepareAnalysisPayload: Hist. project '${projectNameForLog}' unhandled number close\_date=${closeDateVal}.\`);}  
                                    } else { console.warn(\`prepareAnalysisPayload: Hist. project '${projectNameForLog}' unhandled type close\_date='${closeDateVal}'.\`);}

                                    if (timestampToProcessMs \!== null && \!isNaN(timestampToProcessMs)) {  
                                        try {  
                                            const dateObj \= new Date(timestampToProcessMs);  
                                            if (\!isNaN(dateObj.getTime())) {  
                                                closeDateObjForComparison \= dateObj;  
                                                const year \= dateObj.getUTCFullYear();  
                                                const month \= String(dateObj.getUTCMonth() \+ 1).padStart(2, '0');  
                                                const day \= String(dateObj.getUTCDate()).padStart(2, '0');  
                                                formattedWonDate \= \`${year}-${month}-${day}\`;  
                                            } else { console.warn(\`prepareAnalysisPayload: Hist. project '${projectNameForLog}' invalid Date from timestamp ${timestampToProcessMs}.\`);}  
                                        } catch (e) { console.warn(\`prepareAnalysisPayload: Hist. project '${projectNameForLog}' error converting timestamp ${timestampToProcessMs}: ${e.message}.\`);}  
                                    }  
                                } else { console.warn(\`prepareAnalysisPayload: Hist. project '${projectNameForLog}' missing close\_date or empty.\`); }  
                                  
                                let historicalWonDateForLLM \= 'N/A';  
                                const plannedStartDateStr \= projectForLlm.planned\_delivery\_start\_date;

                                if (closeDateObjForComparison && \!isNaN(closeDateObjForComparison.getTime())) {  
                                    if (plannedStartDateStr) {  
                                        const plannedStartDateObj \= parseYYYYMMDDToDate(plannedStartDateStr);  
                                        if (plannedStartDateObj && \!isNaN(plannedStartDateObj.getTime())) {  
                                            if (closeDateObjForComparison.getTime() \<= plannedStartDateObj.getTime()) {  
                                                historicalWonDateForLLM \= formattedWonDate;  
                                            } else {  
                                                console.warn(\`prepareAnalysisPayload: Hist. project '${projectNameForLog}' close\_date (${formattedWonDate}) is after planned\_start\_date (${plannedStartDateStr}). Setting to 'N/A' for LLM.\`);  
                                                historicalWonDateForLLM \= 'N/A';  
                                            }  
                                        } else {  
                                            console.warn(\`prepareAnalysisPayload: Hist. project '${projectNameForLog}' close\_date (${formattedWonDate}), but planned\_start\_date ('${plannedStartDateStr}') is invalid. Passing close\_date to LLM.\`);  
                                            historicalWonDateForLLM \= formattedWonDate; // Policy: pass if start date unparseable  
                                        }  
                                    } else {  
                                        console.warn(\`prepareAnalysisPayload: Hist. project '${projectNameForLog}' close\_date (${formattedWonDate}), but planned\_start\_date is missing. Passing close\_date to LLM.\`);  
                                        historicalWonDateForLLM \= formattedWonDate; // Policy: pass if start date missing  
                                    }  
                                } else {  
                                    historicalWonDateForLLM \= 'N/A'; // close\_date itself was invalid/missing  
                                }  
                                projectForLlm.historical\_opportunity\_won\_date \= historicalWonDateForLLM;  
                                delete projectForLlm.close\_date;  
                                return projectForLlm;  
                            });  
                        } else { console.warn("prepareAnalysisPayload: params.queryResults.data is not an array."); }  
                    } catch (e) { console.error("prepareAnalysisPayload: Major error parsing params.queryResults or processing historical data:", e); historicalDataArrayForLlm \= \[\]; }  
                }  
                const historicalDataString \= JSON.stringify(historicalDataArrayForLlm);  
                const historicalData \= \`\<project\_data\>\\n${historicalDataString}\\n\</project\_data\>\`;  
                const userMessageContent \= \`${newOppDetails}\\n\\n${historicalData}\\n\\n${processedUserPrompt}\`;  
                const messages \= \[{ role: "user", content: \[{ text: userMessageContent }\] }\];  
                let payload;  
                if (systemPromptText && systemPromptText.trim() \!== "") {  
                    payload \= { modelId, messages, system: \[{ text: systemPromptText }\], inferenceConfig: { maxTokens: 10000, temperature: 0.0 } };  
                } else {  
                    payload \= { modelId, messages, inferenceConfig: { maxTokens: 10000, temperature: 0.0 } };  
                }  
                return payload;  
            }  
            if (\!results.CatapultAnalysisPromptNP) { throw new Error("GetPrompt action (CatapultAnalysisPromptNP) output missing."); }  
            return prepareConverseApiPayload(params, results.CatapultAnalysisPromptNP);  
            \`\`\`  
    \* \*\*Action Name: \`invokeNovaPremAnalysis\`\*\*  
        \* \*\*Type/Resource\*\*: Bedrock Runtime Converse  
        \* \*\*Input\*\*: Payload from \`prepareAnalysisPayload\` action.  
        \* \*\*Model ID\*\*: Derived from the fetched prompt.  
    \* \*\*Action Name: \`processAnalysisResults\`\*\*  
        \* \*\*Type/Resource\*\*: JavaScript  
        \* \*\*Input\*\*: \`results.invokeNovaPremAnalysis\`, \`params\`  
        \* \*\*Source Code (Latest version with robust date parsing, conditional logic for calculations, and TypeScript fixes):\*\*  
            \`\`\`javascript  
            // Script for 'processAnalysisResults' in 'finalBedAnalysisPromptNovaPremier' automation  
            // \----- Start: Interface Definitions \-----  
            interface ParsedSimilarProject {  
              projectName?: string; customer?: string; partner?: string; industry?: string;  
              customerSegment?: string; region?: string; subRegion?: string; country?: string;  
              activityFocus?: string; descriptionSummary?: string; businessDescriptionSummary?: string;  
              historicalCloseDate?: string; historicalStartDate?: string; historicalEndDate?: string;     
              actualGapTimeDays?: string; actualProjectDurationMonths?: string;  
              migrationPhase?: string; salesforceLink?: string; awsCalculatorLink?: string;  
              totalMRR?: string; totalARR?: string; statedHistoricalARR?: string; topServices?: string;  
              close\_date\_obj?: Date | null;  
              planned\_delivery\_start\_date\_obj?: Date | null;  
              planned\_delivery\_end\_date\_obj?: Date | null;  
              gap\_days\_calc?: number;   
              execution\_duration\_days\_calc?: number;   
            }  
            interface ArchitectureData {  
              networkFoundation?: string; computeLayer?: string; dataLayer?: string;  
              securityComponents?: string; integrationPoints?: string; scalingElements?: string;  
              managementTools?: string; completeArchitecture?: string;  
            }  
            interface MetricsData {  
              predictedArr: string; predictedMrr: string; launchDate: string;  
              timeToLaunch: number; // Note: This was in original processAnalysisResults, but LLM prompt for NovaPremier uses PREDICTED\_PROJECT\_DURATION  
              predictedProjectDuration?: string; // Added to align with NovaPremier prompt  
              confidence: string; topServices: string;  
              architecture: ArchitectureData; validationErrors: string\[\];  
            }  
            interface SectionData {  
              analysisMethodology?: string; similarProjectsRaw?: string; parsedSimilarProjects?: ParsedSimilarProject\[\];  
              detailedFindings?: string; predictionRationale?: string; riskFactors?: string;  
              architectureDescription?: string; summaryMetrics?: string; validationErrors?: string;  
              avgGapDays?: number; avgExecutionDurationDays?: number;  
            }  
            interface CostValidationResult {  
              calculatedMonthly: number; calculatedAnnualFromComponents: number;  
              statedMrrFromLlm: number; statedArrFromLlm: number; validationErrors: string\[\];  
            }  
            // \----- End: Interface Definitions \-----

            function decodeResponseBody(body: any): string { /\* ... as provided ... \*/   
              if (typeof body \=== 'string') { return body; }  
              if (typeof ArrayBuffer \!== 'undefined' && (body instanceof ArrayBuffer || ArrayBuffer.isView(body))) {  
                return new TextDecoder().decode(body as Uint8Array);  
              }  
              return JSON.stringify(body);  
            }  
            function extractTextFromConverseResponse(converseResponse: any): string { /\* ... as provided ... \*/   
              const text \= converseResponse?.output?.message?.content?.\[0\]?.text;  
              if (typeof text \=== 'string') { return text; }  
              console.warn("Text content not found or not a string in Converse API response structure.");  
              return "Error: Text content not found in LLM response";  
            }  
            function extractValue(textBlock: string | null | undefined, regex: RegExp, defaultValue: string | null \= 'N/A'): string { /\* ... as provided ... \*/   
              if (\!textBlock) return defaultValue ?? 'N/A';  
              const match \= textBlock.match(regex);  
              const value \= match && match\[1\] ? match\[1\].trim() : defaultValue;  
              return (value \=== "" || value \=== null || value \=== undefined) ? (defaultValue ?? 'N/A') : value;  
            }  
            function parseDate(dateStr: string | null | undefined): Date | null { /\* ... as provided ... \*/   
              if (\!dateStr || typeof dateStr \!== 'string' || dateStr.toLowerCase() \=== 'n/a') return null;  
              let dateObj: Date | null \= null;  
              if (dateStr.match(/^\\d{4}-\\d{2}-\\d{2}$/)) {  
                dateObj \= new Date(dateStr \+ "T00:00:00Z");  
              } else if (dateStr.includes('/')) {  
                const parts \= dateStr.split('/');  
                if (parts.length \=== 3\) {  
                  const year \= parseInt(parts\[2\]); const month \= parseInt(parts\[0\]) \- 1; const day \= parseInt(parts\[1\]);  
                  if (year \> 1900 && year \< 2200 && month \>= 0 && month \<= 11 && day \>= 1 && day \<= 31\) {  
                    dateObj \= new Date(Date.UTC(year, month, day));  
                  }  
                }  
              } else if (\!isNaN(Number(dateStr)) && String(dateStr).length \>= 10\) {  
                const numDate \= Number(dateStr);  
                dateObj \= new Date(numDate \* (String(numDate).length \=== 10 ? 1000 : 1));  
              }  
              return (dateObj && \!isNaN(dateObj.getTime())) ? dateObj : null;  
            }  
            function formatDateToYYYYMMDD(dateObj: Date | null | undefined): string { /\* ... as provided ... \*/   
              if (\!dateObj || isNaN(dateObj.getTime())) return 'N/A';  
              const year \= dateObj.getUTCFullYear();  
              const month \= String(dateObj.getUTCMonth() \+ 1).padStart(2, '0');  
              const day \= String(dateObj.getUTCDate()).padStart(2, '0');  
              return \`${year}-${month}-${day}\`;  
            }  
            function formatLaunchDate(dateString: string | null | undefined): string { /\* ... as provided ... \*/   
                if (\!dateString || \!/^\\d{4}-\\d{2}$/.test(dateString) || dateString.toLowerCase() \=== 'n/a') { return dateString || 'N/A'; }  
                const \[year, month\] \= dateString.split('-');  
                const months \= \['January','February','March','April','May','June','July','August','September','October','November','December'\];  
                const monthIndex \= parseInt(month, 10\) \- 1;  
                if (monthIndex \< 0 || monthIndex \>= 12\) { return dateString; }  
                return \`${months\[monthIndex\]} ${year}\`;  
            }  
            function formatCurrency(amountStrOrNum: string | number | null | undefined, defaultValue: string \= '$0'): string { /\* ... as provided ... \*/   
                if (amountStrOrNum \=== null || amountStrOrNum \=== undefined || String(amountStrOrNum).trim() \=== '' || String(amountStrOrNum).trim().toLowerCase() \=== 'n/a') { return defaultValue \=== '$0' ? 'N/A' : defaultValue;}  
                const numericAmount \= typeof amountStrOrNum \=== 'string' ? Number(String(amountStrOrNum).replace(/\[$,\]/g, '')) : Number(amountStrOrNum);  
                if (isNaN(numericAmount)) { return defaultValue \=== '$0' ? 'N/A' : defaultValue; }  
                return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(numericAmount);  
            }  
            function extractArchSection(archSectionText: string | null | undefined, sectionKeyName: string): string { /\* ... as provided ... \*/   
                if (\!archSectionText) return 'N/A';  
                const upperSectionName \= sectionKeyName.toUpperCase().replace(/ /g, '\_');  
                const regex \= new RegExp(\`(?:${upperSectionName}):\\\\s\*(\[^\\\\n\]+(?:\\\\n(?\!NETWORK\_FOUNDATION:|COMPUTE\_LAYER:|DATA\_LAYER:|SECURITY\_COMPONENTS:|INTEGRATION\_POINTS:|SCALING\_ELEMENTS:|MANAGEMENT\_TOOLS:|COMPLETE\_ARCHITECTURE:)\[^\\\\n\]+)\*)\`, 'i');  
                const match \= archSectionText.match(regex);  
                return match && match\[1\] ? match\[1\].trim() : 'N/A';  
            }  
            function parseServiceLineForCalc(line: string): { name: string | null; monthly: number; upfront: number } { /\* ... as provided ... \*/   
                const parts \= line.split('|');  
                if (parts.length \< 2\) return { name: null, monthly: 0, upfront: 0 };  
                const serviceName \= parts\[0\].trim();  
                if (\!serviceName) return { name: null, monthly: 0, upfront: 0 };  
                const monthlyCostMatch \= parts\[1\].trim().match(/\\$?(\[\\d,.\]+)/);  
                const monthlyCost \= monthlyCostMatch ? parseFloat(monthlyCostMatch\[1\].replace(/,/g, '')) : 0;  
                let upfrontCost \= 0;  
                if (parts.length \> 2\) {  
                    const upfrontCostMatch \= parts\[2\].trim().match(/\\$?(\[\\d,.\]+)/);  
                    upfrontCost \= upfrontCostMatch ? parseFloat(upfrontCostMatch\[1\].replace(/,/g, '')) : 0;  
                }  
                return { name: serviceName, monthly: isNaN(monthlyCost) ? 0 : monthlyCost, upfront: isNaN(upfrontCost) ? 0 : upfrontCost };  
            }  
            function processServiceLinesForDisplay(serviceBlockText: string | null | undefined, isHistoricalContext \= false): string { /\* ... as provided ... \*/   
                if (\!serviceBlockText) { return isHistoricalContext ? 'No services listed for this project.' : 'Service information not available'; }  
                let servicesOutputList: string\[\] \= \[\];  
                const cleanedBlock \= serviceBlockText.replace(/^(TOP\_SERVICES:|Top Services \\(Historical Project\\):\\s\*)/i, '').trim();  
                const lines \= cleanedBlock.split('\\n').map(line \=\> line.trim()).filter(line \=\> line);  
                lines.forEach(line \=\> {  
                    if (line.toUpperCase().startsWith('OTHER\_SERVICES:')) {  
                        const otherServicesMatch \= line.match(/OTHER\_SERVICES:\\s\*Combined\\|?(\\$?\[^|\\n\]+)(?:\\|(\\$?\[^|\\n\]+))?/i);  
                        if (otherServicesMatch) {  
                            let otherServiceString \= \`\*\*Other Services (Combined)\*\* \- ${otherServicesMatch\[1\].trim()}\`;  
                            if (otherServicesMatch\[2\]) { otherServiceString \+= \` | ${otherServicesMatch\[2\].trim()}\`; }  
                            servicesOutputList.push(otherServiceString);  
                        }  
                    } else {  
                        const parsedService \= parseServiceLineForCalc(line);  
                        if (parsedService && parsedService.name) {  
                            const displayMonthly \= formatCurrency(parsedService.monthly, 'N/A');  
                            const displayUpfront \= formatCurrency(parsedService.upfront, 'N/A');  
                            let serviceString \= \`\*\*${parsedService.name}\*\* \- ${displayMonthly}/month\`;  
                            if (parsedService.upfront \> 0 || (isHistoricalContext && displayUpfront \!== 'N/A' && displayUpfront \!== '$0')) {  
                                serviceString \+= \` | ${displayUpfront} upfront\`;  
                            }  
                            servicesOutputList.push(serviceString);  
                        } else if (isHistoricalContext && line.includes('|')) { servicesOutputList.push(line); }  
                    }  
                });  
                return servicesOutputList.length \> 0 ? servicesOutputList.join('\\n\\n') : (isHistoricalContext ? 'Services N/A' : 'No service information parsed.');  
            }

            function parseSimilarProjects(similarProjectsRawText: string | null | undefined, historicalDataArrayFromParams: any\[\]): ParsedSimilarProject\[\] {  
                if (\!similarProjectsRawText) return \[\];  
                const projects: ParsedSimilarProject\[\] \= \[\];  
                const projectBlocks \= similarProjectsRawText.split(/--- Project \\d+ \---/i).filter(block \=\> block.trim() \!== "");

                for (const block of projectBlocks) {  
                    const p: ParsedSimilarProject \= { /\* Initialize with defaults as in your provided code \*/   
                        projectName: 'N/A', customer: 'N/A', partner: 'N/A', industry: 'N/A',   
                        customerSegment: 'N/A', region: 'N/A', subRegion: 'N/A', country: 'N/A',   
                        activityFocus: 'N/A', descriptionSummary: 'N/A', businessDescriptionSummary: 'N/A',   
                        historicalCloseDate: 'N/A', historicalStartDate: 'N/A', historicalEndDate: 'N/A',   
                        actualGapTimeDays: 'N/A', actualProjectDurationMonths: 'N/A',   
                        migrationPhase: 'N/A', salesforceLink: 'N/A', awsCalculatorLink: 'N/A',   
                        totalMRR: 'N/A', totalARR: 'N/A', statedHistoricalARR: 'N/A', topServices: 'N/A',  
                        close\_date\_obj: null, planned\_delivery\_start\_date\_obj: null, planned\_delivery\_end\_date\_obj: null,  
                        gap\_days\_calc: undefined, execution\_duration\_days\_calc: undefined  
                    };

                    p.projectName \= extractValue(block, /Project Name:\\s\*(\[^\\n\]+)/i);  
                    p.customer \= extractValue(block, /Customer:\\s\*(\[^\\n\]+)/i);  
                    p.partner \= extractValue(block, /Partner:\\s\*(\[^\\n\]+)/i);  
                    p.industry \= extractValue(block, /Industry:\\s\*(\[^\\n\]+)/i);  
                    p.customerSegment \= extractValue(block, /Customer Segment:\\s\*(\[^\\n\]+)/i);  
                    const regionLine \= extractValue(block, /Region:\\s\*(\[^\\n\]+)/i);  
                    if (regionLine && regionLine \!== 'N/A') {  
                        p.region \= extractValue(regionLine, /^(\[^(\]+)/i, 'N/A').trim();  
                        p.subRegion \= extractValue(regionLine, /Sub-Region:\\s\*(\[^,)\]+)/i, 'N/A');  
                        p.country \= extractValue(regionLine, /Country:\\s\*(\[^)\]+)/i, 'N/A');  
                    }  
                    p.activityFocus \= extractValue(block, /Activity\\/Focus:\\s\*(\[^\\n\]+)/i);  
                    const descMatch \= block.match(/Description:\\s\*(\[\\s\\S\]\*?)(?=Business Description:|Historical Close Date:|$)/i);  
                    p.descriptionSummary \= descMatch && descMatch\[1\] ? descMatch\[1\].trim() : 'N/A';  
                    const bizDescMatch \= block.match(/Business Description:\\s\*(\[\\s\\S\]\*?)(?=Historical Close Date:|$)/i);  
                    p.businessDescriptionSummary \= bizDescMatch && bizDescMatch\[1\] ? bizDescMatch\[1\].trim() : 'N/A';  
                    p.historicalCloseDate \= extractValue(block, /Historical Close Date:\\s\*(\[^\\n\]+)/i);  
                    p.historicalStartDate \= extractValue(block, /Historical Start Date:\\s\*(\[^\\n\]+)/i);  
                    p.historicalEndDate \= extractValue(block, /Historical End Date:\\s\*(\[^\\n\]+)/i);  
                    p.actualGapTimeDays \= extractValue(block, /Actual Gap Time \\(Days\\):\\s\*(\[^\\n\]+)/i);  
                    p.actualProjectDurationMonths \= extractValue(block, /Actual Execution Duration \\(Months\\):\\s\*(\[^\\n\]+)/i);  
                    p.migrationPhase \= extractValue(block, /Migration Phase \\(Historical\\):\\s\*(\[^\\n\]+)/i);  
                    p.salesforceLink \= extractValue(block, /Salesforce Link:\\s\*(https?:\\/\\/\[^\\s\\n\]+)/i);  
                    p.awsCalculatorLink \= extractValue(block, /AWS Calculator Link:\\s\*(\[^\\s\\n\]+)/i);  
                    p.totalMRR \= extractValue(block, /Total MRR:\\s\*(\\$\[^\<\\n\]+)/i);  
                    p.totalARR \= extractValue(block, /Total ARR:\\s\*(\\$\[^\<\\n\]+)/i);  
                    p.statedHistoricalARR \= extractValue(block, /Stated Historical Raw ARR:\\s\*(\[^)\]+)/i);  
                    const topServicesBlockMatch \= block.match(/Top Services \\(Historical Project\\):\\s\*(\[\\s\\S\]\*?)(?=(---|Financials \\(Historical Project\\):|Historical Financials \\(Calculated from its Service Costs\\):|Salesforce Link:|$|\\n\\n\\n))/i);  
                    p.topServices \= topServicesBlockMatch && topServicesBlockMatch\[1\] ? processServiceLinesForDisplay(topServicesBlockMatch\[1\].trim(), true) : 'N/A';  
                      
                    const originalProject \= historicalDataArrayFromParams.find(histP \=\> histP.opportunity\_name \=== p.projectName);  
                    if (originalProject) {  
                        let tempParsedCloseDateObj: Date | null \= null;  
                        const rawCloseDateValue \= originalProject.close\_date;   
                        const rawStartDateStr \= originalProject.planned\_delivery\_start\_date;   
                        const rawEndDateStr \= originalProject.planned\_delivery\_end\_date;     

                        if (rawCloseDateValue \!== null && rawCloseDateValue \!== undefined && String(rawCloseDateValue).trim() \!== "") {  
                            const valAsString \= String(rawCloseDateValue).trim();  
                            const numVal \= Number(valAsString);  
                            if (\!isNaN(numVal) && valAsString.length \>= 13\) {   
                                let msTimestamp;  
                                if (valAsString.length \>= 17\) { msTimestamp \= numVal / 1000000; }   
                                else if (valAsString.length \>= 14\) { msTimestamp \= numVal / 1000; }   
                                else { msTimestamp \= numVal; }  
                                tempParsedCloseDateObj \= new Date(msTimestamp);  
                                if (isNaN(tempParsedCloseDateObj.getTime())) {  
                                    tempParsedCloseDateObj \= null;  
                                    console.warn(\`processAnalysisResults: Invalid Date from originalProject.close\_date (val: ${rawCloseDateValue}) for ${p.projectName}.\`);  
                                }  
                            } else {  
                                tempParsedCloseDateObj \= parseDate(valAsString);  
                                if (\!tempParsedCloseDateObj || isNaN(tempParsedCloseDateObj.getTime())) {  
                                     tempParsedCloseDateObj \= null;  
                                     console.warn(\`processAnalysisResults: Could not parse originalProject.close\_date (val: ${rawCloseDateValue}) for ${p.projectName}.\`);  
                                }  
                            }  
                        }

                        const tempParsedStartDateObj \= parseDate(rawStartDateStr);  
                        const tempParsedEndDateObj \= parseDate(rawEndDateStr);

                        if (tempParsedStartDateObj && \!isNaN(tempParsedStartDateObj.getTime())) {  
                             p.planned\_delivery\_start\_date\_obj \= tempParsedStartDateObj;  
                        }  
                        if (tempParsedEndDateObj && \!isNaN(tempParsedEndDateObj.getTime())) {  
                             p.planned\_delivery\_end\_date\_obj \= tempParsedEndDateObj;  
                        }

                        if (tempParsedCloseDateObj) {  
                            if (p.planned\_delivery\_start\_date\_obj) {  
                                if (tempParsedCloseDateObj.getTime() \<= p.planned\_delivery\_start\_date\_obj.getTime()) {  
                                    p.close\_date\_obj \= tempParsedCloseDateObj;  
                                } else {  
                                    console.warn(\`processAnalysisResults CALC: Raw close\_date for '${p.projectName}' (${formatDateToYYYYMMDD(tempParsedCloseDateObj)}) is after raw start\_date (${formatDateToYYYYMMDD(p.planned\_delivery\_start\_date\_obj\!)}). Invalid for gap calc.\`);  
                                    p.close\_date\_obj \= null;   
                                }  
                            } else {  
                                console.warn(\`processAnalysisResults CALC: Raw planned\_delivery\_start\_date for '${p.projectName}' is missing/invalid. Cannot validate close\_date sequence for gap\_days\_calc.\`);  
                                p.close\_date\_obj \= null;   
                            }  
                        } else {  
                            p.close\_date\_obj \= null;   
                        }

                        if (p.close\_date\_obj && p.planned\_delivery\_start\_date\_obj) {  
                            p.gap\_days\_calc \= Math.max(0, Math.round((p.planned\_delivery\_start\_date\_obj.getTime() \- p.close\_date\_obj.getTime()) / (1000 \* 60 \* 60 \* 24)));  
                        } else {  
                            p.gap\_days\_calc \= undefined;  
                        }

                        if (p.planned\_delivery\_start\_date\_obj && p.planned\_delivery\_end\_date\_obj) {  
                             p.execution\_duration\_days\_calc \= Math.max(0, Math.round((p.planned\_delivery\_end\_date\_obj.getTime() \- p.planned\_delivery\_start\_date\_obj.getTime()) / (1000 \* 60 \* 60 \* 24)));  
                        } else {  
                            p.execution\_duration\_days\_calc \= undefined;  
                        }  
                    }  
                    projects.push(p);  
                }  
                return projects;  
            }

            function validateServiceCostsForPrediction(metricsText: string | null | undefined, params: any): CostValidationResult { /\* ... as provided ... \*/   
                const validationErrorsLoc: string\[\] \= \[\];  
                if (\!metricsText) {  
                    validationErrorsLoc.push('No summary metrics text provided for cost validation.');  
                    return { calculatedMonthly: 0, calculatedAnnualFromComponents: 0, statedMrrFromLlm: 0, statedArrFromLlm: 0, validationErrors: validationErrorsLoc };  
                }  
                let totalMonthlyFromServices \= 0; let totalUpfrontFromServices \= 0;  
                const topServicesBlockMatch \= metricsText.match(/TOP\_SERVICES:?\\s\*(\[\\s\\S\]\*?)(?=OTHER\_SERVICES:|CONFIDENCE:|LAUNCH\_DATE:|PREDICTED\_PROJECT\_DURATION:|MRR:|PREDICTED\_ARR:|===VALIDATION\_ERRORS===|$)/i);  
                if (topServicesBlockMatch && topServicesBlockMatch\[1\]) {  
                    const servicesBlock \= topServicesBlockMatch\[1\].trim();  
                    const lines \= servicesBlock.split('\\n').map(line \=\> line.trim()).filter(line \=\> line);  
                    lines.forEach(line \=\> {  
                        const parsedService \= parseServiceLineForCalc(line);  
                        if (parsedService && parsedService.name) { totalMonthlyFromServices \+= parsedService.monthly; totalUpfrontFromServices \+= parsedService.upfront;}  
                    });  
                }  
                const otherServicesMatch \= metricsText.match(/OTHER\_SERVICES:\\s\*Combined\\|?\\$?(\[\\d,.\]+)\\/month(?:\\|?\\$?(\[\\d,.\]+) upfront)?/i);  
                if (otherServicesMatch) {  
                    totalMonthlyFromServices \+= Number(otherServicesMatch\[1\] ? parseFloat(otherServicesMatch\[1\].replace(/,/g, '')) : 0);  
                    if (otherServicesMatch\[2\]) { totalUpfrontFromServices \+= Number(otherServicesMatch\[2\] ? parseFloat(otherServicesMatch\[2\].replace(/,/g, '')) : 0); }  
                }  
                const statedMrrText \= extractValue(metricsText, /MRR:\\s\*(\\$\[^\<\\n\]+)/i, '$0');  
                const statedArrText \= extractValue(metricsText, /PREDICTED\_ARR:\\s\*(\\$\[^\<\\n\]+)/i, '$0');  
                const statedMrrNum \= parseFloat(String(statedMrrText).replace(/\[$,\]/g, ''));  
                const statedArrNum \= parseFloat(String(statedArrText).replace(/\[$,\]/g, ''));  
                const finalStatedMrr \= isNaN(statedMrrNum) ? 0 : statedMrrNum;  
                const finalStatedArr \= isNaN(statedArrNum) ? 0 : statedArrNum;  
                const calculatedArrFromComponents \= (totalMonthlyFromServices \* 12\) \+ totalUpfrontFromServices;  
                const mrrTolerance \= Math.max(1, finalStatedMrr \* (params.mrrTolerancePercentage || 0.01));  
                if (Math.abs(totalMonthlyFromServices \- finalStatedMrr) \> mrrTolerance) { validationErrorsLoc.push(\`Predicted MRR Mismatch: Sum of service monthly costs is ${formatCurrency(totalMonthlyFromServices)}, but LLM stated MRR is ${formatCurrency(finalStatedMrr)}.\`); }  
                const arrTolerance \= Math.max(1, finalStatedArr \* (params.arrTolerancePercentage || 0.01));  
                if (Math.abs(calculatedArrFromComponents \- finalStatedArr) \> arrTolerance) { validationErrorsLoc.push(\`Predicted ARR Mismatch: Calculated from service costs (MRR\*12 \+ Upfront \= ${formatCurrency(calculatedArrFromComponents)}) vs LLM stated Predicted ARR ${formatCurrency(finalStatedArr)}.\`); }  
                return { calculatedMonthly: totalMonthlyFromServices, calculatedAnnualFromComponents: calculatedArrFromComponents, statedMrrFromLlm: finalStatedMrr, statedArrFromLlm: finalStatedArr, validationErrors: validationErrorsLoc };  
            }

            function extractAllSections(text: string, historicalDataArrayFromParams: any\[\]): SectionData { /\* ... as provided, with explicit : SectionData return type ... \*/   
                const sections: SectionData \= {   
                    analysisMethodology: 'N/A', similarProjectsRaw: '', parsedSimilarProjects: \[\], detailedFindings: 'N/A',   
                    predictionRationale: 'N/A', riskFactors: 'N/A', architectureDescription: 'N/A',   
                    summaryMetrics: 'N/A', validationErrors: 'N/A', avgGapDays: 30, avgExecutionDurationDays: 180  
                };  
                if (\!text) { console.warn("extractAllSections: No text provided."); return sections; }  
                const sectionHeaders \= \["ANALYSIS METHODOLOGY", "SIMILAR PROJECTS", "DETAILED FINDINGS", "PREDICTION RATIONALE", "RISK FACTORS", "ARCHITECTURE DESCRIPTION", "SUMMARY METRICS", "VALIDATION\_ERRORS"\];  
                const keyMap: { \[key: string\]: keyof SectionData } \= {  
                    "ANALYSIS METHODOLOGY": "analysisMethodology", "SIMILAR PROJECTS": "similarProjectsRaw", "DETAILED FINDINGS": "detailedFindings",  
                    "PREDICTION RATIONALE": "predictionRationale", "RISK FACTORS": "riskFactors", "ARCHITECTURE DESCRIPTION": "architectureDescription",  
                    "SUMMARY METRICS": "summaryMetrics", "VALIDATION\_ERRORS": "validationErrors"  
                };  
                for (let i \= 0; i \< sectionHeaders.length; i++) {  
                    const header \= sectionHeaders\[i\];  
                    const escapedHeader \= header.replace(/\[.\*+?^${}()|\[\\\]\\\\\]/g, '\\\\$&').replace(/ /g, '\\\\s\*');  
                    const nextHeaderPattern \= (i \+ 1 \< sectionHeaders.length) ? \`(?=\\\\s\*===${sectionHeaders\[i+1\].replace(/\[.\*+?^${}()|\[\\\]\\\\\]/g, '\\\\$&').replace(/ /g, '\\\\s\*')}===)\` : '($)';  
                    const regexPattern \= new RegExp(\`===${escapedHeader}===\\\\s\*(\[\\\\s\\\\S\]\*?)${nextHeaderPattern}\`, 'i');  
                    const match \= text.match(regexPattern);  
                    const sectionKey \= keyMap\[header\];  
                    if (match && match\[1\] && sectionKey) { (sections as any)\[sectionKey\] \= match\[1\].trim(); }   
                    else if (sectionKey && typeof (sections as any)\[sectionKey\] \=== 'string') { (sections as any)\[sectionKey\] \= 'N/A';}  
                }  
                if (sections.similarProjectsRaw && sections.similarProjectsRaw \!== 'N/A') {  
                    sections.parsedSimilarProjects \= parseSimilarProjects(sections.similarProjectsRaw, historicalDataArrayFromParams);  
                    if (sections.parsedSimilarProjects && sections.parsedSimilarProjects.length \> 0\) {  
                        let totalValidGapDays \= 0; let validGapCount \= 0;  
                        let totalValidExecutionDurationDays \= 0; let validExecutionDurationCount \= 0;  
                        for (const p of sections.parsedSimilarProjects) {  
                            if (p.gap\_days\_calc \!== undefined && \!isNaN(p.gap\_days\_calc) && p.gap\_days\_calc \>= 0\) { totalValidGapDays \+= p.gap\_days\_calc; validGapCount++; }  
                            if (p.execution\_duration\_days\_calc \!== undefined && \!isNaN(p.execution\_duration\_days\_calc) && p.execution\_duration\_days\_calc \> 0\) { totalValidExecutionDurationDays \+= p.execution\_duration\_days\_calc; validExecutionDurationCount++; }  
                        }  
                        sections.avgGapDays \= validGapCount \> 0 ? Math.round(totalValidGapDays / validGapCount) : 30;  
                        sections.avgExecutionDurationDays \= validExecutionDurationCount \> 0 ? Math.round(totalValidExecutionDurationDays / validExecutionDurationCount) : 180;  
                    }  
                } else { sections.parsedSimilarProjects \= \[\]; }  
                return sections;  
            }

            function extractMetricsAndArchitecture( llmText: string, newOppCloseDateStr: string | null | undefined, avgGapDaysFromSimilar: number | undefined, avgExecutionDurationDaysFromSimilar: number | undefined, params: any, historicalDataArrayFromParams: any\[\] ): MetricsData { /\* ... as provided, with explicit : MetricsData return type ... \*/   
                const sections \= extractAllSections(llmText, historicalDataArrayFromParams);  
                const metricsSectionText \= sections.summaryMetrics || "";   
                const archSectionText \= sections.architectureDescription || "";  
                const architectureObject: ArchitectureData \= { /\* ... \*/ }; // Filled by extractArchSection calls  
                architectureObject.networkFoundation= extractArchSection(archSectionText, 'NETWORK\_FOUNDATION');  
                architectureObject.computeLayer= extractArchSection(archSectionText, 'COMPUTE\_LAYER');  
                architectureObject.dataLayer= extractArchSection(archSectionText, 'DATA\_LAYER');  
                architectureObject.securityComponents= extractArchSection(archSectionText, 'SECURITY\_COMPONENTS');  
                architectureObject.integrationPoints= extractArchSection(archSectionText, 'INTEGRATION\_POINTS');  
                architectureObject.scalingElements= extractArchSection(archSectionText, 'SCALING\_ELEMENTS');  
                architectureObject.managementTools= extractArchSection(archSectionText, 'MANAGEMENT\_TOOLS');  
                architectureObject.completeArchitecture= extractArchSection(archSectionText, 'COMPLETE\_ARCHITECTURE');

                const costValidationResult \= validateServiceCostsForPrediction(metricsSectionText, params);  
                const metrics: MetricsData \= {  
                    predictedArr: formatCurrency(costValidationResult.calculatedAnnualFromComponents),  
                    predictedMrr: formatCurrency(costValidationResult.calculatedMonthly),  
                    launchDate: formatLaunchDate(extractValue(metricsSectionText, /LAUNCH\_DATE:\\s\*(\\d{4}-\\d{2})/i)),  
                    timeToLaunch: parseInt(extractValue(metricsSectionText, /TIME\_TO\_LAUNCH:\\s\*(\\d+)/i, '0')), // This might be unused if PREDICTED\_PROJECT\_DURATION is primary  
                    predictedProjectDuration: extractValue(metricsSectionText, /PREDICTED\_PROJECT\_DURATION:\\s\*(\[^\\n\]+)/i, 'N/A'), // Added  
                    confidence: extractValue(metricsSectionText, /CONFIDENCE:\\s\*(HIGH|MEDIUM|LOW)/i, 'UNKNOWN'),  
                    topServices: processServiceLinesForDisplay(metricsSectionText, false),  
                    architecture: architectureObject,  
                    validationErrors: \[...costValidationResult.validationErrors\]  
                };  
                // Timeline validation logic (remains as previously provided)  
                const llmLaunchDateStr \= extractValue(metricsSectionText, /LAUNCH\_DATE:\\s\*(\\d{4}-\\d{2})/i, null);  
                const newOppCloseDateObj \= parseDate(newOppCloseDateStr);  
                if (newOppCloseDateObj && llmLaunchDateStr && llmLaunchDateStr \!== 'N/A' && avgGapDaysFromSimilar \!== undefined && \!isNaN(avgGapDaysFromSimilar) && avgExecutionDurationDaysFromSimilar \!== undefined && \!isNaN(avgExecutionDurationDaysFromSimilar)) {  
                    try { /\* ... timeline validation logic ... \*/ } catch (dateError: any) { metrics.validationErrors.push("Error during timeline validation: " \+ (dateError.message || String(dateError)));}  
                } else { /\* ... reason for not performing timeline validation ... \*/ }  
                const llmValidationErrorText \= (sections.validationErrors || "").trim();  
                if (llmValidationErrorText && llmValidationErrorText.toLowerCase() \!== 'n/a' && \!metrics.validationErrors.some(err \=\> err.includes(llmValidationErrorText))) { metrics.validationErrors.push(\`LLM Validation Note: ${llmValidationErrorText}\`);}  
                return metrics;  
            }

            function generateFormattedSummary(sections: SectionData): string { /\* ... as provided, with :SectionData type for param ... \*/   
                let summary \= "";  
                if (sections.analysisMethodology && sections.analysisMethodology \!== 'N/A') { summary \+= "=== ANALYSIS METHODOLOGY \===\\n" \+ sections.analysisMethodology \+ "\\n\\n"; }  
                if (sections.detailedFindings && sections.detailedFindings \!== 'N/A') { summary \+= "=== DETAILED FINDINGS \===\\n" \+ sections.detailedFindings \+ "\\n\\n"; }  
                if (sections.predictionRationale && sections.predictionRationale \!== 'N/A') { summary \+= "=== PREDICTION RATIONALE \===\\n" \+ sections.predictionRationale \+ "\\n\\n"; }  
                if (sections.riskFactors && sections.riskFactors \!== 'N/A') { summary \+= "=== RISK FACTORS \===\\n" \+ sections.riskFactors \+ "\\n\\n"; }  
                if (sections.architectureDescription && sections.architectureDescription \!== 'N/A') {   
                    let formattedArch \= sections.architectureDescription;  
                    const archParts \= \["NETWORK\_FOUNDATION:", "COMPUTE\_LAYER:", "DATA\_LAYER:", "SECURITY\_COMPONENTS:", "INTEGRATION\_POINTS:", "SCALING\_ELEMENTS:", "MANAGEMENT\_TOOLS:", "COMPLETE\_ARCHITECTURE:"\];  
                    archParts.forEach(part \=\> { const regex \= new RegExp(\`(^|\\\\n)(${part.replace(/\[.\*+?^${}()|\[\\\]\\\\\]/g, '\\\\$&')})\`, 'gi'); formattedArch \= formattedArch.replace(regex, \`$1\\n$2\`); });  
                    formattedArch \= formattedArch.replace(/\\n\\s\*\\n/g, '\\n\\n').replace(/^\\n+/, '').trim();  
                    summary \+= "=== ARCHITECTURE DESCRIPTION \===\\n" \+ formattedArch \+ "\\n\\n";   
                }  
                return summary.trim();  
            }

            function mainEntryProcessFunction(invokeBEDROCKActionOutput: any, params: any): any {  
                const newOpportunityCloseDate \= params.closeDate;  
                const llmGeneratedText \= extractTextFromConverseResponse(invokeBEDROCKActionOutput);  
                let historicalDataArray: any\[\] \= \[\];  
                try { /\* ... parsing params.queryResults ... \*/   
                    if (params.queryResults && typeof params.queryResults \=== 'string') {  
                        const parsedQueryResults \= JSON.parse(params.queryResults);  
                        if (parsedQueryResults && parsedQueryResults.data && Array.isArray(parsedQueryResults.data)) { historicalDataArray \= parsedQueryResults.data;}   
                        else if (Array.isArray(parsedQueryResults)) { historicalDataArray \= parsedQueryResults; }  
                    } else if (params.queryResults && Array.isArray(params.queryResults)) { historicalDataArray \= params.queryResults;}  
                } catch (e: any) { console.error("Error parsing queryResults for historicalDataArray in mainEntry:", e.message); }

                const defaultErrorReturn \= { /\* ... as provided ... \*/ };  
                if (llmGeneratedText.startsWith("Error:") || \!llmGeneratedText || llmGeneratedText.trim() \=== "") {  
                    console.error('LLM Generated Text is missing, empty, or indicates an error:', llmGeneratedText);  
                    return defaultErrorReturn;  
                }

                const sections: SectionData \= extractAllSections(llmGeneratedText, historicalDataArray);  
                const metrics: MetricsData \= extractMetricsAndArchitecture(  
                    llmGeneratedText, newOpportunityCloseDate,  
                    sections.avgGapDays, sections.avgExecutionDurationDays,  
                    params, historicalDataArray  
                );

                const finalSectionsOutput: Partial\<SectionData\> \= { // Explicitly typed  
                    analysisMethodology: sections.analysisMethodology || 'N/A',  
                    similarProjectsRaw: sections.similarProjectsRaw || '',   
                    parsedSimilarProjects: sections.parsedSimilarProjects || \[\],   
                    detailedFindings: sections.detailedFindings || 'N/A',  
                    predictionRationale: sections.predictionRationale || 'N/A',  
                    riskFactors: sections.riskFactors || 'N/A',  
                    architectureDescription: sections.architectureDescription || 'N/A',  
                    validationErrors: metrics.validationErrors.length \> 0 ? metrics.validationErrors.join('; ') : (sections.validationErrors || 'No specific validation notes.'),  
                    avgGapDays: sections.avgGapDays,   
                    avgExecutionDurationDays: sections.avgExecutionDurationDays  
                };  
                  
                const formattedSummary \= generateFormattedSummary(sections);

                return {  
                    fullText: llmGeneratedText,  
                    sections: finalSectionsOutput as SectionData,   
                    metrics: metrics,  
                    formattedSummaryText: formattedSummary  
                };  
            }

            if (\!results.invokeNovaPremAnalysis) {   
                const invokeErrorMsg \= "Error: results.invokeNovaPremAnalysis (output of Bedrock Converse step for analysis) is not available.";  
                console.error(invokeErrorMsg);  
                // Provide a default error structure matching the expected output  
                const defaultArchitectureError \= { networkFoundation: 'N/A', computeLayer: 'N/A', dataLayer: 'N/A', securityComponents: 'N/A', integrationPoints: 'N/A', scalingElements: 'N/A', managementTools: 'N/A', completeArchitecture: 'N/A' };  
                return {   
                    fullText: "Error: Bedrock invocation result missing.",  
                    sections: { analysisMethodology: 'N/A', similarProjectsRaw: '', parsedSimilarProjects: \[\], detailedFindings: 'N/A', predictionRationale: 'N/A', riskFactors: 'N/A', architectureDescription: 'N/A', summaryMetrics: 'N/A', validationErrors: 'Bedrock invocation result missing.', avgGapDays: 30, avgExecutionDurationDays: 180 },  
                    metrics: { predictedArr: 'N/A', predictedMrr: 'N/A', launchDate: 'N/A', timeToLaunch: 0, predictedProjectDuration: 'N/A', confidence: 'LOW', topServices: 'Error: Bedrock invocation result missing.', architecture: defaultArchitectureError, validationErrors: \['Bedrock invocation result (invokeNovaPremAnalysis) is missing.'\] },  
                    formattedSummaryText: "Error: Could not generate summary due to missing Bedrock invocation results."  
                };  
            }  
            return mainEntryProcessFunction(results.invokeNovaPremAnalysis, params);  
            \`\`\`

\#\#\# 2.5. Automation: \`invokeBedrockQuery\` (Legacy/Alternative)  
\* \*\*Purpose\*\*: Alternative/earlier automation for SQL query generation using Bedrock InvokeModel API.  
\* \*\*Status\*\*: Legacy. Not primary flow.  
    \*(Details omitted for brevity as it's legacy, but available in previous handover document versions if needed for historical reference.)\*

\---

\#\# 3\. Bedrock Prompt Details

\#\#\# 3.1. Prompt Name: "CatapultQueryPrompt"  
\* \*\*Prompt ID\*\*: \`Y6T66EI3GZ\`  
\* \*\*Model Used\*\*: Amazon Titan Text Premier (or as configured in the Bedrock Prompt Resource, typically derived dynamically by \`invokeBedrockQueryPrompt\` automation).  
\* \*\*Purpose\*\*: Generates a Presto SQL query for AWS Athena.  
\* \*\*System Instructions\*\*: (As per V0.3.3.0 in original document)  
    \`\`\`plaintext  
    You are an AI assistant specializing in constructing fully syntactically correct Presto SQL queries specifically designed for Amazon Athena. Your task is to generate an SQL query based on provided AWS partner opportunity details to identify historically similar AWS projects from a table named \`parquet\`. Your primary goal is to find the \*most similar\* historical projects by intelligently and flexibly matching the new opportunity's details against the historical data, ensuring a relevant sample set is retrieved for downstream prediction tasks.  
    Your response MUST be a single JSON object, precisely in the following format: \`{"sql\_query": "YOUR\_SQL\_QUERY\_STRING"}\`  
    Important Instructions:  
    \* Your entire response MUST begin immediately with the character { and end immediately with the character }.  
    \* There must be absolutely NO text, explanations, analysis, reports, conversational preamble (like "Here is the query..."), postamble, or any characters whatsoever before the opening { or after the closing } of the single JSON object.  
    \* Do NOT wrap the JSON object in markdown (e.g., do not use \`\`\`json ... \`\`\`).  
    \* Regarding the YOUR\_SQL\_QUERY\_STRING value for the sql\_query key:  
        \* This string must be the complete, valid, and executable Presto SQL query.  
        \* If your SQL query is multi-line for readability, the string value you generate for sql\_query should contain literal newline characters (ASCII 10\) at each line break.  
        \* If your SQL query uses double quotes for identifiers (e.g., column names with spaces or special characters like "monthly $ service1"), the string value you generate for sql\_query should contain literal double quote characters (ASCII 34\) around those identifiers.  
        \* Crucially, do not include two-character escape sequences like \\\\n (backslash followed by 'n') or \\\\\\" (backslash followed by quote) within the string value you create for sql\_query itself. The system that serializes your entire JSON response will automatically handle the necessary JSON escaping (e.g., a literal newline in your string value becomes \\\\n in the final transmitted JSON string). Your responsibility is to ensure the sql\_query value string itself is the direct, clean SQL.  
    \* Term Derivation and Bias Prevention: When deriving terms for matching and scoring (e.g., core opportunity terms, customer terms, keywords), these terms must be strictly and justifiably derived from the text and meaning of the current new opportunity's input details ({{CustomerName}}, {{oppName}}, {{oppDescription}}) ONLY. Do not use external knowledge or artifacts from other contexts or previous tests. Prioritize terms that strongly indicates similarity for technology projects, AWS services, project scope, and customer needs relevant to this specific new opportunity.  
    \* Flexibility in Term Derivation: When deriving terms, use your understanding of language to consider common synonyms, acronyms, or slight variations if they accurately reflect the intent of the input (e.g., if 'database' is a concept, also consider 'DB'; if 'migration' is mentioned, terms like 'migrate' or 'data exit' might be relevant if contextually supported by the input description). All such flexible derivations must remain strongly anchored to the provided input.  
    \* Note on Column Referencing: When defining the historical\_projects CTE and referencing columns from the parquet table within that CTE's SELECT list or WHERE clause, refer to the columns directly by their names (e.g., close\_date, industry, opportunity\_name) without any table prefix, as parquet is the direct source. The alias historical\_projects should only be used in the final SELECT statement from the CTE.  
    Input Parameters (for the new opportunity):  
    \* \`{{CustomerName}}\`: String (e.g., 'Concentra')  
    \* \`{{region}}\`: String (e.g., 'United States')  
    \* \`{{closeDate}}\`: String (e.g., '3/5/2025') \- Format M/D/YYYY. This is the new opportunity's close date.  
    \* \`{{oppName}}\`: String (e.g., 'Sybase Modernization Services')  
    \* \`{{oppDescription}}\`: String describing the new opportunity in detail.  
    SQL Query Requirements:  
    The SQL query should search the \`parquet\` table.  
    1\.  Overall Query Structure:  
        \* Define a Common Table Expression (CTE) named \`historical\_projects\`.  
        \* Inside this CTE, select columns from the \`parquet\` table and calculate the \`relevance\_score\` based on multiple factors (detailed below).  
        \* The outer query will be \`SELECT \* FROM historical\_projects WHERE relevance\_score \>= 45 ORDER BY relevance\_score DESC LIMIT 100\`. (Adjust LIMIT as needed for performance vs. sample size; 100 is current).  
    2\.  \`historical\_projects\` CTE \`WHERE\` Clause Construction:  
        The \`WHERE\` clause \*inside the definition of the \`historical\_projects\` CTE\* (filtering rows from \`parquet\`) should be very broad. It must include:  
        \* The \`\[temporal\_condition\]\` (defined below, using \`{{closeDate}}\` for the new opportunity, which should be applied flexibly).  
    3\.  Placeholder Logic and Definitions (for use inside the \`historical\_projects\` CTE definition):  
        \* \`\[temporal\_condition\]\`:  
            \* The \`close\_date\` column in \`parquet\` (historical project close date) is \`bigint\`. Assume Unix timestamp in nanoseconds; use \`from\_unixtime(close\_date / 1000000000)\` for seconds.  
            \* Construct a temporal condition. If \`{{closeDate}}\` (new opportunity close date) is provided, use a very broad window: \`from\_unixtime(close\_date / 1000000000\) \> (date\_parse('{{closeDate}}', '%c/%e/%Y') \- interval '3' year)\`. If \`{{closeDate}}\` is not suitable for finding relevant comparables (e.g., too far in future), you may omit this filter.  
            \* Input \`{{closeDate}}\` format is M/D/YYYY (\`'%c/%e/%Y'\`).  
        \* \`\[relevance\_score\_calculation\]\` (calculated in the \`SELECT\` list of \`historical\_projects\` CTE, aliased as \`relevance\_score\`):  
            This score should be based on:  
            \* \+20 points if the historical \`opportunity\_name\` contains significant keywords from the new \`{{oppName}}\`. (Use \`lower()\` and \`LIKE\` for flexible matching of derived keywords).  
            \* \+15 points if the historical \`description\` (or equivalent field like \`opportunity-description\`) contains significant keywords derived from the new \`{{oppDescription}}\`. (Use \`lower()\` and \`LIKE\`).  
            \* \+10 points if the historical \`customer\_name\` is similar to \`{{CustomerName}}\`. (Consider \`lower()\` and \`LIKE\`).  
            \* \+5 points if the historical \`industry\` matches or is related to the new opportunity's implied industry (derived from \`{{oppDescription}}\` or \`{{oppName}}\`).  
            \* \+5 points if the historical \`migration\_phase\` (if available) aligns with the new opportunity's implied phase.  
            \* \+5 points if the historical \`opportunity\_region\` (or \`oppertunity-sub-region\` or \`country\`) aligns with \`{{region}}\`.  
            \* Consider partial matches and synonyms for keywords when deriving terms from \`{{oppName}}\` and \`{{oppDescription}}\`.  
            The \`relevance\_score\` should be calculated by directly summing the CASE expressions.  
            For example: \`(CASE WHEN lower(opportunity\_name) LIKE '%keyword1%' THEN 20 ELSE 0 END) \+ (CASE WHEN lower(description) LIKE '%keyword2%' THEN 15 ELSE 0 END) \+ ... AS relevance\_score\`.  
            Ensure all derived terms for matching come from the new opportunity's input details only.  
    4\.  \*\*Selected Fields for Output (in the \`SELECT\` list of the \`historical\_projects\` CTE):\*\*  
        \*(Ensure this list perfectly matches your \`parquet\` table schema, with correct quoting for any names containing spaces or special characters like \`$\`, \`-\`.)\*  
        \`activity\_name, project\_type, cor\_gtm\_apn\_sfdc, program, "unified program mapping", customer\_name, "aws account id", FORMAT('%,.0f', annual\_run\_rate\_usd) AS annual\_run\_rate\_usd, aws\_account\_id\_for\_this\_project, opportunity\_18\_character\_oppty\_id, apn\_oppty\_id, customer\_segment, industry, close\_date, planned\_delivery\_start\_date, planned\_delivery\_end\_date, migration\_phase, opportunity\_region, "oppertunity-sub-region", country, opportunity\_name, description, business\_description, partner\_name, spms\_id, apfp\_aws\_calculator\_url, calculator\_uid,\`  
        \`service1, "monthly $ service1", "upfront $ service1",\`  
        \`service2, "monthly $ service2", "upfront $ service2",\`  
        \`service3, "monthly $ service3", "upfront $ service3",\`  
        \`service4, "monthly $ service4", "upfront $ service4",\`  
        \`service5, "monthly $ service5", "upfront $ service5",\`  
        \`service6, "monthly $ service6", "upfront $ service6",\`  
        \`service7, "monthly $ service7", "upfront $ service7",\`  
        \`service8, "monthly $ service8", "upfront $ service8",\`  
        \`service9, "monthly $ service9", "upfront $ service9",\`  
        \`servicex, "monthly $ servicex", "upfront $ servicex"\`  
        And, importantly, include the \`\[relevance\_score\_calculation\]\` aliased as \`relevance\_score\` in this \`SELECT\` list.  
    \`\`\`  
\* \*\*User Message Template\*\*:  
    \`\`\`plaintext  
    Please generate a Presto SQL query for Amazon Athena using the provided opportunity details to find similar historical AWS projects.  
    Opportunity Details:  
    Customer Name: {{CustomerName}}  
    Region: {{region}}  
    Close Date: {{closeDate}}  
    Opportunity Name: {{oppName}}  
    Opportunity Description: {{oppDescription}}  
    \`\`\`

\#\#\# 3.2. Prompt Name: "CatapultAnalysisPrompt" (Original for \`finalBedAnalysisPrompt\`)  
\* \*\*Prompt ID\*\*: \`FDUHITJIME\`  
\* \*\*Model Used\*\*: Amazon Titan Text Premier (or as configured in the Bedrock Prompt Resource, typically derived dynamically by \`finalBedAnalysisPrompt\` automation).  
\* \*\*Purpose\*\*: To analyze new opportunity details and historical project data (original version).  
\* \*\*System Instructions\*\*: (As per V0.3.4.0 in original document)  
\* \*\*User Message\*\*: (As per V0.3.4.0 in original document, which includes \`PREDICTED\_PROJECT\_DURATION\` and removes \`TIME\_TO\_LAUNCH\`)

\#\#\# 3.3. Prompt Name: "CatapultAnalysisPrompt\_NovaPremier"  
\* \*\*Used by Automation\*\*: \`finalBedAnalysisPromptNovaPremier\`  
\* \*\*Prompt Identifier in Bedrock\*\*: e.g., \`arn:aws:bedrock:us-east-1:701976266286:prompt/P03B9TO1Q1\` (or the actual ARN/ID used for this specific prompt).  
\* \*\*Model Used\*\*: Amazon Nova Premier (configured in the Bedrock Prompt Management console for this specific prompt resource).  
\* \*\*Purpose\*\*: To analyze new opportunity details and historical project data using Amazon Nova Premier, providing a comprehensive project assessment, financial predictions, and architectural suggestions, with conditional handling of historical close dates.  
\* \*\*System Instructions\*\*:  
    \`\`\`plaintext  
    You are an AWS Solution Architect and expert data analyst. Your primary task is to analyze new AWS partner opportunity details (provided by the user) and a provided dataset of similar historical AWS projects (also provided by the user) to produce a detailed, strictly formatted prediction report. The historical project dataset is already sorted by an initial relevance\_score.  
    \*\*CRITICAL OVERALL RESPONSE FORMAT REQUIREMENTS:\*\*  
    1\.  Your entire response MUST be ONLY the structured text report as defined in the user's instructions.  
    2\.  There must be absolutely NO conversational preamble (e.g., "Okay, here is the analysis..."), postamble, explanations, or any characters whatsoever outside the defined report structure.  
    3\.  \*\*ABSOLUTELY CRITICAL: Your response must be plain text ONLY. Do NOT wrap any part of your response in markdown code blocks of any kind (e.g., \`\`\`json ... \`\`\`, \`\`\`text ... \`\`\`, \`\`\`yaml ... \`\`\`, or any other \`\`\` opening or closing sequences). Violation of this rule will render the output unusable.\*\*  
    4\.  The response MUST start immediately with the first characters of the "===ANALYSIS METHODOLOGY===" section and end immediately with the last character of the content in the "===VALIDATION\_ERRORS===" section (or the section marker itself if that section is intentionally left blank as per instructions).  
    5\.  \*\*Output Validation Confirmation:\*\* In the "===VALIDATION\_ERRORS===" section, you MUST include a statement confirming the number of projects received (N) and the number of projects actually used for your focused core analysis (M). For example: "Confirmation: Core analysis based on M=\[M\_value\_you\_used\] of N=\[N\_value\_provided\] projects. M was determined by \[briefly state how M was derived, e.g., 'selecting the top 75% most relevant projects, with a minimum of 25 applied'\]." If you identify other validation errors, list them first, then append this confirmation. If no other errors, this confirmation is primary.  
    \*\*DATA USAGE, ANALYSIS SCOPE, DE-DUPLICATION, AND DERIVATION RULES:\*\*  
    1\.  All predictions, findings, and details for similar projects MUST be derived exclusively from the information provided in the new opportunity information and the historical project dataset. Ensure all historical project data fields (like \`historical\_opportunity\_won\_date\` (pre-formatted as\<y\_bin\_46\>-MM-DD or 'N/A'), \`planned\_delivery\_start\_date\`, \`planned\_delivery\_end\_date\`, and all service cost fields) are consistently available and in a valid, parsable format.  
    2\.  Project Selection for Analysis and "Similar Projects" Section:  
        a.  Initial Project Pool: You will be provided with a dataset of historical projects. Let N be the total number of projects in this dataset.  
        b.  \*\*Focused Subset for Core Analysis (M Projects):\*\* From the pool of N projects, your \*\*primary task for analysis\*\* is to work with a focused subset of M projects.  
            \*\*Determine M as follows (follow these steps precisely and in order):\*\*  
            1\.  Set your target percentage for the subset, which should be 75% (i.e., 0.75).  
            2\.  Calculate \`M\_ideal \= round(0.75 \* N)\`.  
            3\.  If N \< 25, then your M \= N (use all N projects).  
            4\.  Else (if N \>= 25), your M \= \`M\_ideal\`. However, if \`M\_ideal\` is less than 25, then M \= 25\. (Effectively, M \= max(25, \`M\_ideal\`) if N\>=25, otherwise M=N).  
            \*\*You MUST use this calculated M number of projects for your core analysis\*\* when generating "===DETAILED FINDINGS===", "===PREDICTION RATIONALE===", and "===SUMMARY METRICS===". These M projects should be the ones with the highest relevance and comparability to the new opportunity.  
        c.  \*\*Reporting N and M in Methodology:\*\* Your "===ANALYSIS METHODOLOGY===" section MUST explicitly state the N and M values you used. \*\*The FIRST bullet point of your methodology MUST follow this template (fill in your N and calculated M):\*\* "- The core predictive analysis was performed on a focused subset of M=\[YOUR\_CALCULATED\_M\_VALUE\] highly relevant historical projects. This M subset was selected from a total pool of N=\[TOTAL\_N\_PROJECTS\_RECEIVED\] projects provided, based on taking the top \~75% most relevant opportunities (with a minimum of 25 projects applied if N was sufficient)." \*\*Subsequent bullet points in the methodology MUST then clearly detail how patterns, timelines, costs, and service usage from this specific M-project subset informed your analysis and predictions for the new opportunity.\*\*  
        d.  Display of Similar Projects: For the "===SIMILAR PROJECTS===" section of your textual report, you will detail only the top 3 most representative unique historical projects, selected from the overall N projects. This selection is for display and illustration, and is separate from the M projects used for the deeper analytical work.  
        e.  De-duplication: When selecting projects for any purpose (focused subset M or top 3 display), if multiple entries share the same \`opportunity\_18\_character\_oppty\_id\`, use only the instance with the highest \`relevance\_score\` for consideration.  
    3\.  \*\*ARR/MRR Calculation Philosophy:\*\* (No change from version user provided in prior turn for CatapultAnalysisPrompt)  
    4\.  \*\*Term Derivation and Bias Prevention:\*\* (No change from version user provided in prior turn for CatapultAnalysisPrompt)  
    5\.  \*\*Flexibility in Term Derivation:\*\* (No change from version user provided in prior turn for CatapultAnalysisPrompt)  
    6\.  Adhere meticulously to all calculation rules, formatting requirements, and section structures provided in the user's instructions that will follow.  
    \---  
    \*\*SECTION-SPECIFIC INSTRUCTIONS FOR YOUR RESPONSE (Follow these for structure and content):\*\*  
    ANALYSIS\_METHODOLOGY:  
    \- Start with: "The core predictive analysis was performed on a focused subset of M=\[YOUR\_CALCULATED\_M\_VALUE\] highly relevant historical projects. This M subset was selected from a total pool of N=\[TOTAL\_N\_PROJECTS\_RECEIVED\] projects provided, based on taking the top \~75% most relevant opportunities (with a minimum of 25 projects applied if N was sufficient)."  
    \- Subsequent bullet points MUST detail your methodology for predicting LAUNCH\_DATE, PREDICTED\_PROJECT\_DURATION, ARR, and selecting TOP\_SERVICES, focusing on how the M-subset informed your conclusions.  
    DETAILED\_FINDINGS:  
    \- Key insights derived from comparing the new opportunity with the M subset of historical projects. Focus on technical similarities, challenges, and success factors.  
    PREDICTION\_RATIONALE:  
    \- Justification for your PREDICTED\_ARR, LAUNCH\_DATE, and PREDICTED\_PROJECT\_DURATION in SUMMARY\_METRICS, based on the M subset. Explain how historical data supports these predictions. Consider the typical timeline from opportunity close to project start when predicting the LAUNCH\_DATE and project duration.  
    RISK\_FACTORS:  
    \- Potential risks for the new opportunity, drawing parallels from the M subset. Include technical, operational, and financial risks.  
    ARCHITECTURE\_DESCRIPTION:  
      NETWORK\_FOUNDATION: \[Description\]  
      COMPUTE\_LAYER: \[Description\]  
      DATA\_LAYER: \[Description\]  
      SECURITY\_COMPONENTS: \[Description\]  
      INTEGRATION\_POINTS: \[Description\]  
      SCALING\_ELEMENTS: \[Description\]  
      MANAGEMENT\_TOOLS: \[Description\]  
      COMPLETE\_ARCHITECTURE: \[Overall textual description of the proposed architecture for the new opportunity, based on the M subset projects.\]  
    SUMMARY\_METRICS:  
      PREDICTED\_ARR: ${formatted\_arr}  
      MRR: ${formatted\_mrr}  
      LAUNCH\_DATE: {YYYY-MM} \# This is the predicted project start date  
      PREDICTED\_PROJECT\_DURATION: {String like "X months" or "Y years and Z months"} \# Estimated time to complete project from LAUNCH\_DATE  
      TOP\_SERVICES: \# List top 3-5 predicted services and their estimated monthly costs based on M subset.  
        {aws\_service\_1}|${monthly\_cost\_1}/month|${upfront\_cost\_1} upfront  
        {aws\_service\_2}|${monthly\_cost\_2}/month|${upfront\_cost\_2} upfront  
        {aws\_service\_3}|${monthly\_cost\_3}/month|${upfront\_cost\_3} upfront  
        {aws\_service\_4}|${monthly\_cost\_4}/month|${upfront\_cost\_4} upfront  
        OTHER\_SERVICES:Combined|${remaining\_monthly}/month|${remaining\_upfront} upfront \# If more than 4 services with costs, combine less significant ones here.  
      CONFIDENCE: {HIGH|MEDIUM|LOW} \# Your confidence in the predictions.  
    VALIDATION\_ERRORS:  
    \- Identify any missing data, inconsistencies, or limitations in the provided data that affected your analysis (e.g., if historical\_opportunity\_won\_date is 'N/A' for key comparable projects from the M subset, note its impact). If none, state "None identified."  
    \- Confirmation: Core analysis based on M=\[M\_value\_you\_used\] of N=\[N\_value\_provided\] projects. M was determined by \[briefly state how M was derived, e.g., 'selecting the top 75% most relevant projects, with a minimum of 25 applied'\].  
    \`\`\`  
\* \*\*User Message\*\*:  
    \`\`\`plaintext  
    Please analyze the new opportunity detailed in the provided new opportunity information (\<opp\_details\> tag) and the historical project dataset provided in the \<project\_data\> tag. Generate a comprehensive analysis and prediction report. The new opportunity's Close Date (from the new opportunity information, format M/D/YYYY) is {CloseDate\_placeholder\_for\_rule\_reference\_only}. Follow ALL instructions below for the report content, structure, formatting, and calculations. Do not deviate from the specified format in any way:  
    \===ANALYSIS METHODOLOGY===  
    (Your "ANALYSIS METHODOLOGY" section MUST begin with a bullet point precisely stating the total number of historical projects received (N) and the number of projects (M) that your core predictive analysis was based upon. \*\*You MUST use and adapt the following template for your FIRST bullet point, filling in the N and M values as determined by your system guidelines:\*\* "- The core predictive analysis was performed on a focused subset of M=\[M\_value\_you\_calculated\_and\_used\] highly relevant historical projects. This M subset was selected from a total pool of N=\[N\_value\_provided\] projects provided, based on taking the top \~75% most relevant opportunities (with a minimum of 25 projects applied if N was sufficient)."  
    Then, continue with \*\*2-4 additional bullet points.\*\* Each point should be a concise sentence. \*\*These subsequent points MUST clearly explain how this specific focused subset of M projects (and patterns observed within them, such as their historical timelines, durations, and costs) was used to inform your predictions (LAUNCH\_DATE, PREDICTED\_PROJECT\_DURATION, ARR, services) for the new opportunity.\*\*)  
    \===SIMILAR PROJECTS===  
    {From the provided historical project dataset, select and detail only the top 3 most representative unique historical projects (unique by opportunity\_18\_character\_oppty\_id, preferring highest relevance\_score if duplicates exist). These 3 projects should be the most illustrative for comparison to the new opportunity. For each of these 3 projects, provide the following information with the specified friendly labels and in the order shown, each on a new line starting with a hyphen bullet ("- "). Extract information directly and verbatim from the corresponding fields in the historical project dataset for that project, unless a calculation or summary is specified. Ensure all monetary values are formatted as $XXX,XXX with no decimals, unless the raw value is non-numeric (e.g., empty, "12", "N/A") in which case use it as is or as "N/A". For dates, if available in format\<y\_bin\_46\>-MM-DD, use that; otherwise, use "N/A".}  
    \--- Project 1 \---  
    \- Project Name: {opportunity\_name\_from\_data}  
    \- Customer: {customer\_name\_from\_data\_if\_available\_else\_NA}  
    \- Partner: {partner\_name\_from\_data\_if\_available\_else\_NA}  
    \- Industry: {industry\_from\_data\_if\_available\_else\_NA}  
    \- Customer Segment: {customer\_segment\_from\_data\_if\_available\_else\_NA}  
    \- Region: {opportunity\_region\_from\_data\_if\_available\_else\_NA} (Sub-Region: {oppertunity\_sub\_region\_from\_data\_if\_available\_else\_NA}, Country: {country\_from\_data\_if\_available\_else\_NA})  
    \- Activity/Focus: {activity\_name\_from\_data\_if\_available\_else\_NA}  
    \- Description: {\*\*Single, very brief sentence\*\* summarizing the historical project's 'description' field. Max 20 words.}  
    \- Business Description: {\*\*Single, very brief sentence\*\* summarizing the historical project's 'business\_description' field. Max 25 words.}  
    \- Historical Close Date: {historical\_opportunity\_won\_date}  
    \- Historical Start Date: {planned\_delivery\_start\_date\_from\_data\_YYYY-MM-DD\_else\_NA}  
    \- Historical End Date: {planned\_delivery\_end\_date\_from\_data\_YYYY-MM-DD\_else\_NA}  
    \- Actual Gap Time (Days): {Calculated: planned\_delivery\_start\_date \- Historical Close Date (using the\<y\_bin\_46\>-MM-DD value from the 'historical\_opportunity\_won\_date' field). If dates invalid/missing, state "N/A".}  
    \- Actual Execution Duration (Months): {Calculated duration in whole months: (Historical End Date \- Historical Start Date). If dates invalid/missing, state "N/A". Round up.}  
    \- Migration Phase (Historical): {migration\_phase\_from\_data\_if\_available\_else\_NA}  
    \- Salesforce Link: \[https://aws-crm.lightning.force.com/lightning/r/Opportunity/\](https://aws-crm.lightning.force.com/lightning/r/Opportunity/){opportunity\_18\_character\_oppty\_id}/view  
    \- AWS Calculator Link: {apfp\_aws\_calculator\_url\_from\_data\_if\_available\_else\_NA}  
    \- Historical Financials (Calculated from its Service Costs):  
        \- Total MRR: ${Calculated sum of all 'monthly $ serviceX' fields for this project from the historical project dataset. Format $XXX,XXX. If no numeric service costs, state "N/A".}  
        \- Total ARR: ${Calculated ((this project's Total MRR as numeric) \* 12\) \+ sum of all its numeric 'upfront $ serviceX' fields for this project from the historical project dataset. Format $XXX,XXX. If no numeric service costs, state "N/A".}  
    \- Stated Historical Raw ARR: ${raw\_annual\_run\_rate\_usd\_from\_data\_formatted\_if\_available\_else\_NA}  
    \- Top Services (Historical Project):  
    \- {aws\_service\_1\_for\_this\_project}|${monthly\_cost\_1\_for\_this\_project\_formatted}/month|${upfront\_cost\_1\_for\_this\_project\_formatted} upfront  
    \- {aws\_service\_2\_for\_this\_project}|${monthly\_cost\_2\_for\_this\_project\_formatted}/month|${upfront\_cost\_2\_for\_this\_project\_formatted} upfront  
    \- {aws\_service\_3\_for\_this\_project}|${monthly\_cost\_3\_for\_this\_project\_formatted}/month|${upfront\_cost\_3\_for\_this\_project\_formatted} upfront  
    \- {aws\_service\_4\_for\_this\_project}|${monthly\_cost\_4\_for\_this\_project\_formatted}/month|${upfront\_cost\_4\_for\_this\_project\_formatted} upfront  
    \- {If more than 4 services with costs for this project, add on a new line: OTHER\_SERVICES: Combined|${remaining\_monthly\_for\_this\_project\_formatted}/month|${remaining\_upfront\_for\_this\_project\_formatted} upfront. If 4 or less with costs, omit OTHER\_SERVICES line.}  
    {Repeat this entire bulleted block, clearly delineated with "--- Project 2 \---", "--- Project 3 \---" as separators, for exactly 3 unique similar projects.}  
    \===DETAILED FINDINGS===  
    (Provide key insights derived from comparing the new opportunity with the \*\*focused subset of M historical projects\*\*. Present as a bulleted list of \*\*max 3-4 brief points\*\*. Each point should be a \*\*short, impactful phrase or a single, very concise sentence.\*\*)  
    \===PREDICTION RATIONALE===  
    (Explain the core reasoning behind your predictions in SUMMARY METRICS (including PREDICTED\_ARR, LAUNCH\_DATE, and PREDICTED\_PROJECT\_DURATION), based on your analysis of the \*\*focused subset of M historical projects\*\*. Present as a \*\*bulleted list of max 2-4 brief points\*\*. Each point should be a concise sentence focusing on critical drivers from the new opportunity details and patterns observed in the M projects.)  
    \===RISK FACTORS===  
    (List potential risks for the new opportunity, informed by the analysis of the \*\*focused subset of M historical projects\*\* and the nature of the new opportunity. Present as a bulleted list of \*\*max 3-4 concise phrases.\*\*)  
    \===ARCHITECTURE DESCRIPTION===  
    (Based on the new opportunity description and common patterns from the \*\*focused subset of M historical projects\*\*, describe a plausible high-level AWS architecture. Use the following sub-headings. \*\*For each sub-heading (NETWORK\_FOUNDATION, COMPUTE\_LAYER, etc.), provide a list of key components OR a single, very brief descriptive phrase (max 15 words).\*\* If a sub-component is not applicable or cannot be inferred, state "N/A" or "Could not be determined.")  
    NETWORK\_FOUNDATION: {Single line description or list key components of predicted VPCs, subnets, networking for the new opportunity based on patterns in the M historical projects and the new opportunity information}  
    COMPUTE\_LAYER: {Single line description or list key components of predicted compute resources for the new opportunity based on patterns in the M historical projects and the new opportunity information}  
    DATA\_LAYER: {Single line description or list key components of predicted data resources for the new opportunity based on patterns in the M historical projects and the new opportunity information}  
    SECURITY\_COMPONENTS: {Single line description or list key components of predicted security elements for the new opportunity based on patterns in the M historical projects and the new opportunity information}  
    INTEGRATION\_POINTS: {Single line description or list key components of predicted integrations for the new opportunity based on patterns in the M historical projects and the new opportunity information}  
    SCALING\_ELEMENTS: {Single line description or list key components of predicted scaling for the new opportunity based on patterns in the M historical projects and the new opportunity information}  
    MANAGEMENT\_TOOLS: {Single line description or list key components of predicted tools for the new opportunity based on patterns in the M historical projects and the new opportunity information}  
    COMPLETE\_ARCHITECTURE: {A \*\*single, brief paragraph (max 2-3 concise sentences)\*\* summarizing how these components work together for the proposed solution.}  
    \===SUMMARY METRICS===  
    PREDICTED\_ARR: ${formatted\_arr}  
    MRR: ${formatted\_mrr}  
    LAUNCH\_DATE: {YYYY-MM}  
    PREDICTED\_PROJECT\_DURATION: {String like "X months" or "Y years and Z months"}  
    TOP\_SERVICES:  
    {aws\_service\_1}|${monthly\_cost\_1}/month|${upfront\_cost\_1} upfront  
    {aws\_service\_2}|${monthly\_cost\_2}/month|${upfront\_cost\_2} upfront  
    {aws\_service\_3}|${monthly\_cost\_3}/month|${upfront\_cost\_3} upfront  
    {aws\_service\_4}|${monthly\_cost\_4}/month|${upfront\_cost\_4} upfront  
    OTHER\_SERVICES:Combined|${remaining\_monthly}/month|${remaining\_upfront} upfront  
    CONFIDENCE: {HIGH|MEDIUM|LOW}  
    \===VALIDATION\_ERRORS===  
    {List any validation errors or inconsistencies you encountered based on your internal rule checks (e.g., if data for timeline calculations was insufficient or if predicted service costs seem anomalous compared to similar projects). Leave blank if none identified by you. Downstream script will add its own validation messages. Ensure this section is fully generated.}

    \*\*RULES FOR \===SIMILAR PROJECTS=== SECTION (using data from the historical project dataset):\*\*  
    \- \*\*Historical Dates:\*\*  
        \- For \`Historical Close Date\` (when the historical opportunity was won): \*\*If the \`historical\_opportunity\_won\_date\` field (pre-formatted as \`YYYY-MM-DD\` or 'N/A' in the input project data you receive) is 'N/A' or absent for a project, OMIT the entire '- Historical Close Date:' line for that specific project. Otherwise, display its value using the label '- Historical Close Date:'.\*\*  
        \- For \`Historical Start Date\` (when the project delivery started), extract from the project's \`planned\_delivery\_start\_date\` field (typically already \`YYYY-MM-DD\`). If missing or not a valid \`YYYY-MM-DD\` string, display "N/A".  
        \- For \`Historical End Date\` (when the project delivery concluded), extract from the project's \`planned\_delivery\_end\_date\` field (typically already \`YYYY-MM-DD\`). If missing or not a valid \`YYYY-MM-DD\` string, display "N/A".  
        \- \*\*Crucially, these are distinct dates. \`Historical Close Date\` represents when the opportunity was won, and \`Historical End Date\` represents when the project delivery finished. They must be sourced from their respective fields (\`historical\_opportunity\_won\_date\`, \`planned\_delivery\_start\_date\`, \`planned\_delivery\_end\_date\`). Do not substitute one for another.\*\*  
    \- \*\*Actual Gap Time (Days):\*\* Calculate as (\`planned\_delivery\_start\_date\` \- \`Historical Close Date\`) in days for the historical project, using the \`YYYY-MM-DD\` formatted dates. If \`Historical Close Date\` was omitted (because the input \`historical\_opportunity\_won\_date\` was 'N/A') or if \`planned\_delivery\_start\_date\` is "N/A", state "N/A" for the gap time.  
    \- \*\*Actual Execution Duration (Months):\*\* Calculate as (\`Historical End Date\` \- \`Historical Start Date\`) for the historical project, using \`YYYY-MM-DD\` formatted dates. Result should be a whole number of months (e.g., if duration is 45 days, output "2 months" by rounding up; if 70 days, output "3 months"). If dates are "N/A", state "N/A".  
    \- \*\*Other fields:\*\* As detailed in the template above.  
    \*\*SERVICE FORMAT REQUIREMENTS (for PREDICTED services for the NEW opportunity in \===SUMMARY METRICS===):\*\*  
    (No changes from previous version provided for CatapultAnalysisPrompt)  
    \*\*CALCULATION RULES (for PREDICTED values for the NEW opportunity in \===SUMMARY METRICS===):\*\*  
    (No changes from previous version provided for CatapultAnalysisPrompt)  
    \`\`\`

\---

\#\# 4\. Lambda Functions

\#\#\# 4.1. Lambda Function: \`catapult\_get\_dataset\`  
\* \*\*Triggered by\*\*: \`InvLamFilterAut\` automation.  
\* \*\*Functionality\*\*:  
    \* Takes a JSON payload with an \`sql\_query\` key (e.g., \`{"sql\_query":"SELECT ..."}\`).  
    \* Connects to AWS Athena.  
    \* Executes the query against the \`catapult\_db\_p\` database (or relevant database) and the \`parquet\` table (source of historical project data).  
    \* Note: The \`close\_date\` column in the \`parquet\` table is a Unix timestamp, likely in nanoseconds, requiring division by 1,000,000,000 for conversion to seconds for \`from\_unixtime()\` in SQL.  
    \* Returns query results as JSON.  
\* \*\*Purpose\*\*: Backend for executing dynamic SQL queries on AWS Athena.

\---

\#\# 5\. General Configurations & Parameters  
\* \*\*Bedrock Model for SQL Generation ("CatapultQueryPrompt")\*\*: Amazon Titan Text Premier (or as configured in the Bedrock Prompt Resource).  
\* \*\*Bedrock Model for Original Analysis ("CatapultAnalysisPrompt")\*\*: Amazon Titan Text Premier (or as configured in the Bedrock Prompt Resource).  
\* \*\*Bedrock Model for Nova Premier Test Analysis ("CatapultAnalysisPrompt\_NovaPremier")\*\*: Amazon Nova Premier.  
\* \*\*Bedrock Prompt IDs\*\*:  
    \* "CatapultQueryPrompt": \`Y6T66EI3GZ\`  
    \* "CatapultAnalysisPrompt" (Original): \`FDUHITJIME\`  
    \* "CatapultAnalysisPrompt\_NovaPremier": e.g., \`arn:aws:bedrock:us-east-1:701976266286:prompt/P03B9TO1Q1\` (or actual ARN/ID).  
\* \*\*Athena Configuration\*\*:  
    \* Database: \`catapult\_db\_p\` (or as configured in Lambda).  
    \* Table: \`parquet\` (for historical projects).

\---

\#\# 6\. Release Notes

\*(Keep existing V0.1.0 through V0.3.4.0 descriptions)\*

\#\#\# V0.3.5.0 (Notionally, May 27, 2025 \- Morning)  
\* \*\*Focus\*\*: Testing Amazon Nova Premier and addressing historical\_close\_date inconsistencies.  
\* \*\*New Components\*\*:  
    \* Automation: \`finalBedAnalysisPromptNovaPremier\` created to test "Amazon Nova Premier" model.  
        \* Action: \`CatapultAnalysisPromptNP\` (GetPrompt) fetches the new "CatapultAnalysisPrompt\_NovaPremier".  
        \* Action: \`prepareAnalysisPayload\` script updated for robust multi-format \`close\_date\` (nanoseconds, seconds, milliseconds as string or number) parsing from raw historical data, converting to \`YYYY-MM-DD\` for \`historical\_opportunity\_won\_date\`. Implemented conditional logic: if parsed historical \`close\_date\` is after \`planned\_delivery\_start\_date\`, \`historical\_opportunity\_won\_date\` is set to 'N/A' for LLM.  
        \* Action: \`invokeNovaPremAnalysis\` (Bedrock Converse) calls Nova Premier.  
        \* Action: \`processAnalysisResults\` script updated to:  
            \* Correctly parse raw nanosecond \`close\_date\` from \`originalProject\` data.  
            \* Apply same conditional logic (close date vs. start date) for setting \`p.close\_date\_obj\` used in \`gap\_days\_calc\`.  
            \* Ensured TypeScript type safety with explicit return types for \`extractMetricsAndArchitecture\` (\`: MetricsData\`), \`extractAllSections\` (\`: SectionData\`), \`validateServiceCostsForPrediction\` (\`: CostValidationResult\`), and \`finalSectionsOutput\` (\`: Partial\<SectionData\>\`).  
    \* Bedrock Prompt: "CatapultAnalysisPrompt\_NovaPremier" created for Amazon Nova Premier.  
        \* User Message: Updated "RULES FOR \===SIMILAR PROJECTS=== SECTION" to instruct LLM to OMIT "Historical Close Date:" line if \`historical\_opportunity\_won\_date\` is 'N/A'. Clarified "Actual Gap Time (Days)" calculation based on omitted close date.  
    \* UI Button: \`oppDetQueryButtonV4\` created to trigger the new \`finalBedAnalysisPromptNovaPremier\` flow for testing.  
\* \*\*Changed\*\*:  
    \* SQL Query (for \`catapult\_get\_dataset\` via Lambda): Identified that \`close\_date\` in \`parquet\` table is a nanosecond timestamp. Queries using \`from\_unixtime\` must divide by 1,000,000,000. Athena queries updated to handle this and potential serialization errors by using \`date\_format\`.  
\* \*\*State\*\*: Conditional date logic implemented and tested. \`processAnalysisResults\` script for \`finalBedAnalysisPromptNovaPremier\` now compiles without errors after TypeScript type annotations were corrected. Console log review indicates the new flow and conditional logic are working as expected.

\---

\#\# 7\. Coding Partner (AI Assistant) Collaboration Guidelines  
\* \*\*Provide Version Descriptions\*\*: For each set of changes that would constitute a new publishable version in AWS App Studio, the AI will provide a concise version description (under 500 characters), noting the automation, action, and any prompt/resource involved.  
\* \*\*Supply Complete Code for Replacement\*\*: When script modifications are advised, the AI will provide the fully updated code block (or full prompt text for System/User messages) to ensure clarity and minimize errors during implementation. If providing a snippet, clear "before" and "after" context will be given. Preference is for full code.  
\* \*\*Maintain Supportive Tone\*\*: The AI will maintain a positive, patient, and supportive tone.  
\* \*\*Use Clear and Simple Language\*\*: Explanations and instructions will be provided in clear, simple language.  
\* \*\*Stay Focused on Coding\*\*: The AI will strictly discuss coding-related topics.  
\* \*\*Maintain Conversational Context\*\*: The AI will strive to keep context across the entire conversation.  
\* \*\*Structured Assistance Process\*\*: Understand Request, Solution Overview, Code & Implementation, Thorough Documentation.  
\* \*\*Cite Sources\*\*: When referring to information explicitly provided in uploaded documents, the AI will use citations (e.g., \[cite: X\]).  
\* \*\*Clarify Scope for Changes\*\*: When asking for changes to actions/scripts/prompts, the AI will specify which automation and which part of the prompt (System Instructions or User Message) the changes apply to, especially if names are similar across different components.  
\* \*\*Verify Current Code\*\*: If there's uncertainty about the current state of a script or prompt before suggesting changes, the AI will ask for the latest version.

