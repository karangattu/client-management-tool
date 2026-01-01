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
  { value: "snap", label: "SNAP (Food Stamps)" },
  { value: "wic", label: "WIC" },
  { value: "tanf", label: "TANF/CalWORKs" },
  { value: "housing", label: "Housing Assistance (Section 8, etc.)" },
  { value: "utilities", label: "Utility Assistance (LIHEAP)" },
  { value: "childcare", label: "Childcare Subsidy" },
  { value: "other", label: "Other" },
];

export const HEALTH_STATUS_OPTIONS = [
  { value: "excellent", label: "Excellent" },
  { value: "very_good", label: "Very Good" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];
