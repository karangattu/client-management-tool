export const US_STATES = [
    { value: "AL", label: "Alabama" },
    { value: "AK", label: "Alaska" },
    { value: "AZ", label: "Arizona" },
    { value: "AR", label: "Arkansas" },
    { value: "CA", label: "California" },
    { value: "CO", label: "Colorado" },
    { value: "CT", label: "Connecticut" },
    { value: "DE", label: "Delaware" },
    { value: "FL", label: "Florida" },
    { value: "GA", label: "Georgia" },
    { value: "HI", label: "Hawaii" },
    { value: "ID", label: "Idaho" },
    { value: "IL", label: "Illinois" },
    { value: "IN", label: "Indiana" },
    { value: "IA", label: "Iowa" },
    { value: "KS", label: "Kansas" },
    { value: "KY", label: "Kentucky" },
    { value: "LA", label: "Louisiana" },
    { value: "ME", label: "Maine" },
    { value: "MD", label: "Maryland" },
    { value: "MA", label: "Massachusetts" },
    { value: "MI", label: "Michigan" },
    { value: "MN", label: "Minnesota" },
    { value: "MS", label: "Mississippi" },
    { value: "MO", label: "Missouri" },
    { value: "MT", label: "Montana" },
    { value: "NE", label: "Nebraska" },
    { value: "NV", label: "Nevada" },
    { value: "NH", label: "New Hampshire" },
    { value: "NJ", label: "New Jersey" },
    { value: "NM", label: "New Mexico" },
    { value: "NY", label: "New York" },
    { value: "NC", label: "North Carolina" },
    { value: "ND", label: "North Dakota" },
    { value: "OH", label: "Ohio" },
    { value: "OK", label: "Oklahoma" },
    { value: "OR", label: "Oregon" },
    { value: "PA", label: "Pennsylvania" },
    { value: "RI", label: "Rhode Island" },
    { value: "SC", label: "South Carolina" },
    { value: "SD", label: "South Dakota" },
    { value: "TN", label: "Tennessee" },
    { value: "TX", label: "Texas" },
    { value: "UT", label: "Utah" },
    { value: "VT", label: "Vermont" },
    { value: "VA", label: "Virginia" },
    { value: "WA", label: "Washington" },
    { value: "WV", label: "West Virginia" },
    { value: "WI", label: "Wisconsin" },
    { value: "WY", label: "Wyoming" },
    { value: "DC", label: "District of Columbia" },
];

export const RELATIONSHIPS = [
    { value: "spouse", label: "Spouse" },
    { value: "parent", label: "Parent" },
    { value: "child", label: "Child" },
    { value: "sibling", label: "Sibling" },
    { value: "grandparent", label: "Grandparent" },
    { value: "grandchild", label: "Grandchild" },
    { value: "aunt_uncle", label: "Aunt/Uncle" },
    { value: "niece_nephew", label: "Niece/Nephew" },
    { value: "cousin", label: "Cousin" },
    { value: "friend", label: "Friend" },
    { value: "neighbor", label: "Neighbor" },
    { value: "caregiver", label: "Caregiver" },
    { value: "legal_guardian", label: "Legal Guardian" },
    { value: "other", label: "Other" },
];

export const CLIENT_STATUSES = [
    { value: "active", label: "Active", color: "success" },
    { value: "inactive", label: "Inactive", color: "secondary" },
    { value: "pending", label: "Pending", color: "warning" },
    { value: "closed", label: "Closed", color: "destructive" },
    { value: "on_hold", label: "On Hold", color: "outline" },
];

export const HOUSING_STATUSES = [
    { value: "housed", label: "Housed" },
    { value: "homeless", label: "Homeless" },
    { value: "at_risk", label: "At Risk of Homelessness" },
    { value: "transitional", label: "Transitional Housing" },
    { value: "shelter", label: "Emergency Shelter" },
    { value: "couch_surfing", label: "Couch Surfing" },
    { value: "unknown", label: "Unknown" },
];

export const LANGUAGES = [
    { value: "en", label: "English" },
    { value: "es", label: "Spanish" },
    { value: "zh", label: "Chinese (Mandarin)" },
    { value: "tl", label: "Tagalog" },
    { value: "vi", label: "Vietnamese" },
    { value: "ko", label: "Korean" },
    { value: "fa", label: "Farsi/Persian" },
    { value: "ar", label: "Arabic" },
    { value: "ru", label: "Russian" },
    { value: "ja", label: "Japanese" },
    { value: "hi", label: "Hindi" },
    { value: "pt", label: "Portuguese" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
    { value: "it", label: "Italian" },
    { value: "other", label: "Other" },
];

export const RACE_OPTIONS = [
    { value: "american_indian", label: "American Indian, Alaska Natives, or Indigenous" },
    { value: "asian", label: "Asian or Asian American" },
    { value: "black", label: "Black, African American, or African" },
    { value: "hispanic", label: "Hispanic, Latin(a)(o)(x), or Spanish" },
    { value: "middle_eastern", label: "Middle Eastern or North African" },
    { value: "pacific_islander", label: "Native Hawaiian or Pacific Islander" },
    { value: "white", label: "White" },
    { value: "unknown", label: "Client doesn't know" },
    { value: "refused", label: "Client refused" },
    { value: "not_collected", label: "Data not collected" },
];

export const GENDER_OPTIONS = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "transgender_male", label: "Transgender Male" },
    { value: "transgender_female", label: "Transgender Female" },
    { value: "non_binary", label: "Non-Binary" },
    { value: "genderqueer", label: "Genderqueer" },
    { value: "questioning", label: "Questioning" },
    { value: "other", label: "Other" },
    { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export const ETHNICITY_OPTIONS = [
    { value: "hispanic", label: "Hispanic or Latino" },
    { value: "not_hispanic", label: "Not Hispanic or Latino" },
    { value: "unknown", label: "Unknown" },
    { value: "refused", label: "Client refused" },
];

export const MARITAL_STATUS_OPTIONS = [
    { value: "single", label: "Single" },
    { value: "married", label: "Married" },
    { value: "divorced", label: "Divorced" },
    { value: "widowed", label: "Widowed" },
    { value: "separated", label: "Separated" },
    { value: "domestic_partner", label: "Domestic Partnership" },
];

export const MONTHS = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
];

export const EMPLOYMENT_STATUS_OPTIONS = [
    { value: "full_time", label: "Full Time" },
    { value: "part_time", label: "Part Time" },
    { value: "unemployed", label: "Unemployed" },
    { value: "retired", label: "Retired" },
    { value: "student", label: "Student" },
    { value: "disabled", label: "Disabled" },
    { value: "other", label: "Other" },
];

export const INCOME_SOURCES = [
    { value: "earned", label: "Earned Income" },
    { value: "unemployment", label: "Unemployment Benefits" },
    { value: "ssi", label: "SSI" },
    { value: "ssdi", label: "SSDI" },
    { value: "pension", label: "Pension" },
    { value: "child_support", label: "Child Support" },
    { value: "other", label: "Other" },
    { value: "none", label: "No Income" },
];

export const HEALTH_INSURANCE_TYPES = [
    { value: "medicaid", label: "Medicaid/Medi-Cal" },
    { value: "medicare", label: "Medicare" },
    { value: "private", label: "Private Insurance" },
    { value: "va", label: "VA Health Care" },
    { value: "employer", label: "Employer Provided" },
    { value: "none", label: "None" },
    { value: "other", label: "Other" },
];

export const BENEFITS_OPTIONS = [
    { value: "", label: "--Please Select--" },
    { value: "adsa", label: "ADSA (Assistance Dog Special Allowance Application)" },
    { value: "adult_education", label: "Adult Education" },
    { value: "bank_accounts", label: "Bank Accounts" },
    { value: "bhhp_referral", label: "BHHP Referral Form" },
    { value: "birth_certificate", label: "Birth Certificate" },
    { value: "budgeting", label: "Budgeting" },
    { value: "calfresh", label: "CalFresh" },
    { value: "caltrain", label: "CalTrain" },
    { value: "calworks", label: "CalWORKs" },
    { value: "capi", label: "CAPI (Cash Assistance Program for Immigrants)" },
    { value: "car", label: "Car" },
    { value: "car_registration", label: "Car Registration" },
    { value: "care_fera", label: "CARE (California Alternate Rates for Energy) / FERA (Family Electric Rate Assistance Program)" },
    { value: "community_involvement", label: "Community Involvement" },
    { value: "credit_repair", label: "Credit Repair" },
    { value: "criminal_record_clearance", label: "Criminal Record Clearance" },
    { value: "dd214_request", label: "DD214 Request" },
    { value: "dp_parking_placard", label: "Disabled Person (DP) Parking Placard" },
    { value: "dp_parking_placard_no_id", label: "Disabled Person (DP) Parking Placard. No ID" },
    { value: "dp_parking_plate", label: "Disabled Person (DP) Parking Plate" },
    { value: "discharge_upgrade", label: "Discharge Upgrade" },
    { value: "employment_authorization_card", label: "Employment Authorization Card" },
    { value: "employment_support", label: "Employment Support" },
    { value: "extra_mile_service", label: "Extra Mile Service" },
    { value: "family_relations", label: "Family Relations" },
    { value: "free_hotspot_students", label: "Free Hotspot for Students" },
    { value: "fss", label: "FSS (Family Self-Sufficiency)" },
    { value: "general_assistance", label: "General Assistance" },
    { value: "general_assistance_cash_housing", label: "General Assistance - Cash Housing Benefit Payment" },
    { value: "general_assistance_housing", label: "General Assistance - Housing Assistance" },
    { value: "green_card_replacement", label: "Green Card Replacement Application" },
    { value: "homelessness_prevention", label: "Homelessness Prevention" },
    { value: "housing_solutions_deposit", label: "Housing Solutions - Deposit and First Month Rent" },
    { value: "housing_solutions_home_sharing", label: "Housing Solutions - Home Sharing" },
    { value: "housing_solutions_hcv", label: "Housing Solutions - Housing Choice Voucher" },
    { value: "housing_solutions_recertification", label: "Housing Solutions - Housing Recertification" },
    { value: "housing_solutions_hud_vash", label: "Housing Solutions - HUD-VASH (Veteran Affairs Supportive Housing)" },
    { value: "housing_solutions_psh", label: "Housing Solutions - Permanent Supportive Housing (PSH)" },
    { value: "housing_solutions_rrh", label: "Housing Solutions - Rapid Rehousing (RRH)" },
    { value: "housing_solutions_search", label: "Housing Solutions - Search" },
    { value: "housing_solutions_section_8_interest", label: "Housing Solutions - Section 8 Interest List" },
    { value: "id_card_reduced_fee", label: "ID Card Application - Reduced Fee" },
    { value: "id_card_fee_waiver", label: "ID Card Application Fee Waiver" },
    { value: "ihss_application", label: "IHSS (In-House Supportive Services Application)" },
    { value: "ihss_provider", label: "IHSS Provider" },
    { value: "itin_application", label: "ITIN Application" },
    { value: "life_skills", label: "Life Skills" },
    { value: "lifeline_phone", label: "LifeLine Phone" },
    { value: "liheap", label: "LIHEAP (Low Income Home Energy Assistance Program)" },
    { value: "mail_service", label: "Mail Service" },
    { value: "mckinney_vento", label: "McKinney-Vento Homeless Assistance Act" },
    { value: "meals_on_wheels", label: "Meals on Wheels" },
    { value: "medical_application", label: "Medi-Cal Application" },
    { value: "medical_baseline_allowance", label: "Medical Baseline Allowance" },
    { value: "money_management", label: "Money Management" },
    { value: "move_in", label: "Move in" },
    { value: "myconnectsv", label: "MyConnectSV" },
    { value: "naturalization", label: "Naturalization" },
    { value: "other", label: "Other" },
    { value: "paratransit_pass", label: "Paratransit Pass Application (SCC VTA)" },
    { value: "personal_assistance", label: "Personal Assistance" },
    { value: "request_reasonable_accommodation", label: "Request for Reasonable Accommodation" },
    { value: "safe_parking_referral", label: "Safe Parking Referral" },
    { value: "scc_section_8_signup", label: "SCC Section 8 Interest List Sign Up" },
    { value: "self_sufficiency_program", label: "Self-Sufficiency Program" },
    { value: "shelter_referral", label: "Shelter Referral" },
    { value: "silver_sneakers", label: "Silver Sneakers" },
    { value: "social_security_card_replacement", label: "Social Security Card (replacement) Application" },
    { value: "social_support", label: "Social Support" },
    { value: "ssdi", label: "SSDI (Social Security Disability Income)" },
    { value: "ssi", label: "SSI (Supplemental Security Income)" },
    { value: "ssi_ssdi_appeals", label: "SSI (Supplemental Security Income) /SSDI (Social Security disability Income) Appeals" },
    { value: "ssi_restaurant_meals", label: "SSI - Restaurant Meals Allowance" },
    { value: "uplift_pass", label: "UPLIFT Pass (Universal Pass for Life Improvement From Transportation)" },
    { value: "va_disability_compensation", label: "VA Disability Compensation" },
    { value: "va_health_insurance", label: "VA Health Insurance Application" },
    { value: "va_pension", label: "VA Pension" },
    { value: "vi_spdat", label: "VI-SPDAT (Vulnerability Index - Service Prioritization Decision Assistance Tool)" },
    { value: "wic", label: "WIC (Women, Infant, and Children)" },
    { value: "ymca_membership", label: "YMCA Membership Free" },
];

export const HEALTH_STATUS_OPTIONS = [
    { value: "excellent", label: "Excellent" },
    { value: "very_good", label: "Very Good" },
    { value: "good", label: "Good" },
    { value: "fair", label: "Fair" },
    { value: "poor", label: "Poor" },
];

export const ENGAGEMENT_LETTER_TEXT = `The United Effort Organization, Inc.
Client Engagement Letter

Updated March 2024

Dear Client,

This engagement letter (the “Letter”) explains the terms of our relationship and describes the services The United Effort Organization, Inc. (“United Effort,” “we,” “us,” or “our”) will offer to you (“you”). Please review, sign and return one copy of this letter to us at your earliest convenience.

1. What We Do. We are a non-profit organization that supports people in need by helping them obtain basic benefits and become self-sufficient. For example, we can help you apply for or keep benefits, search for housing and give you support as you try to become self-sufficient. We also have a list of resources that can help you find food, hygiene, medical support, transportation, employment, housing, and other basic needs. Together, we call these resources and the types of assistance we provide, our “Services.” While we may assist you in your interactions with attorneys or third parties, we are not your legal counsel and we do not provide legal advice to you.

2. Fees and Costs. We don’t charge a fee for our Services, but there may be other costs that come up from time to time (like housing application fees and charges for background checks) (“Costs”). You are responsible for paying all Costs.

3. Your Responsibilities. You agree to cooperate with us by:
- giving us complete information or documents that we need to provide the Services and updating that information when needed;
- helping us get information and documents from other people or sources so that we can provide the Services;
- letting us know about changes to your address, e-mail address, telephone number, or changes in your situation which may impact our ability to provide you with the Services;
- keeping in contact with us so we can provide the Services; and
- keeping and being on time for all appointments.

4. Our Responsibilities. Using the information you give us, we will:
- keep you informed about the status of the Services that we provided for you;
- use your personal information as we describe in our Privacy Policy available at www.theunitedeffort.org/home/policy and included with this Letter;
- talk with you before making any big decisions about the Services that apply to you;
- return all original documents that you have given us; and
- keep a file of documents related to your case for as long as we believe it is necessary to fulfill the reason it was collected, including to meet any legal, accounting, or other reporting requirements or obligations.

We cannot guarantee anything through our Services, but we will strive to do the best we can to help you.

As noted above, our Services do not include legal advice of any kind. We are not undertaking to act as your legal counsel in any capacity. Should you need legal advice, you should obtain that from independent counsel authorized to provide legal advice in the State of California.

5. Your Information. You understand that we may have to share your information with our volunteers, government agencies, and other relevant third parties, in order to provide you with the Services. By agreeing to this letter, you consent to us sharing your personal information with third parties to provide you with the Services.

6. Withdrawal/Termination of Services. You agree that we may stop providing the Services to you, at any time and for any reason and that you may also request to end our relationship at any time.

7. Third Party Services. Our Services may connect you or provide you with access to third party services (i.e. housing related services and services offering other benefits), that are independent from us. Your interactions with these organizations or individuals are solely between you and those organizations or individuals. You should make whatever investigation you feel necessary or appropriate before continuing with any interaction with any of these third parties. You agree that we are not responsible or liable for any loss or damage of any kind or nature incurred as the result of any such dealings. If there is a dispute between you any third party, you understand and agree that we are under no obligation to become involved and we have no responsibility or liability with respect to same. You hereby release us and our affiliates, and all of our officers, employees, agents, and successors from claims, demands, and damages (actual and consequential) of every kind or nature, known and unknown, suspected and unsuspected, disclosed and undisclosed, arising out of or in any way related to such disputes.

YOU HEREBY WAIVE CALIFORNIA CIVIL CODE SECTION 1542 (AND ANY OTHER SIMILAR APPLICABLE STATE STATUTE), WHICH PROVIDES: A GENERAL RELEASE DOES NOT EXTEND TO CLAIMS THAT THE CREDITOR OR RELEASING PARTY DOES NOT KNOW OR SUSPECT TO EXIST IN HIS OR HER FAVOR AT THE TIME OF EXECUTING THE RELEASE AND THAT, IF KNOWN BY HIM OR HER, WOULD HAVE MATERIALLY AFFECTED HIS OR HER SETTLEMENT WITH THE DEBTOR OR RELEASED PARTY.

8. DISCLAIMER OF LIABILITY. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, YOU UNDERSTAND THAT YOUR USE OF THE SERVICES IS AT YOUR SOLE RISK. THE SERVICES ARE PROVIDED ON AN “AS IS” AND “AS AVAILABLE” BASIS. THE SERVICES ARE PROVIDED WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT OR COURSE OF PERFORMANCE. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, WE WILL NOT BE LIABLE TO YOU FOR ANY INDIRECT, SPECIAL, INCIDENTAL, PUNITIVE, OR CONSEQUENTIAL DAMAGES ARISING OUT OF OR IN CONNECTION WITH THE SERVICES OR THIS LETTER, HOWEVER CAUSED, AND UNDER WHATEVER CAUSES OF ACTION OR THEORY OF LIABILITY BROUGH (INCLUDING UNDER ANY CONTRACT, NEGLIGENCE TORT, BY STATUTE OR OTHERWISE IN CONNECTION WITH THE SERVICES), EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, OUR TOTAL CUMULATIVE LIABILITY TO YOU ARISING OUT OF OR IN CONNECTION WITH THE SERVICES, FROM ALL CAUSES OF ACTION AND ALL THEORIES OF LIABILITY, WILL BE LIMITED TO AND WILL NOT EXCEED $1,000.

9. Choice of Law & Venue. All claims arising out of or related to this letter will be governed solely by the internal laws of the State of California, including without limitation applicable federal law, without reference to any conflicts of law principles. You agree that all disputes regarding this Letter will be subject to the federal and state courts of Santa Clara County, California.

10. Severability. To the extent permitted by applicable law, the parties hereby waive any provision of law that would render any clause of this Letter invalid or otherwise unenforceable in any respect. In the event that a provision of this Letter is held to be invalid or otherwise unenforceable, such provision will be interpreted to fulfill its intended purpose to the maximum extent permitted by applicable law, and the remaining provisions of this letter will continue in full force and effect.

11. Waiver. The failure by us to enforce any right or provision of this Letter will not prevent us from enforcing such right or provision in the future.

12. Complete Agreement. By signing below, you agree that you have read and understand this Letter. This Letter constitutes the entire agreement between you and United Effort regarding the Services. We are pleased to have this opportunity to assist you and look forward to working with you.

This engagement letter is made in both English and Spanish, and the versions in two languages shall be equally authentic. If there is any discrepancy between the two versions, the English version shall prevail.`;
