// gemini.js - Gemini AI utilities
import dotenv from 'dotenv'
dotenv.config();
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load API key from .env
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Please add GEMINI_API_KEY to your .env file');
}
 
const genAI = new GoogleGenerativeAI(API_KEY);

// Function to validate crime report comments using Gemini AI
export const validateCrimeReportComments = async (typeOfCrime, comments) => {
  try {
    if (!API_KEY) {
      console.warn('Gemini API key not found, skipping validation');
      return true; // Skip validation if API key is not available
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Replace 'Other' with a more meaningful description for better validation
    let crimeTypeForValidation = typeOfCrime;
    if (typeOfCrime.toLowerCase() === 'other') {
      crimeTypeForValidation = 'a criminal incident or safety concern that doesn\'t fit into standard categories like theft, robbery, or harassment';
    }
    
    const prompt = `You are a crime report validation system. Your task is to determine if the provided comments are relevant to the reported crime type.

Crime Type: "${crimeTypeForValidation}"
Comments: "${comments}"

Analyze if the comments describe an incident that matches the crime type. Consider:
- Does the comment describe an actual incident related to the crime type?
- Is it coherent and relevant to the reported crime?
- Does it provide meaningful details about the incident?

Respond with ONLY "Yes" if the comments are relevant and coherent, or "No" if they are irrelevant, incoherent, or appear to be gibberish.

Response:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const validationResult = response.text().trim().toLowerCase();
    
    console.log(`Gemini validation for ${typeOfCrime}: ${validationResult}`);
    
    return validationResult === 'yes';
  } catch (error) {
    console.error('Gemini validation error:', error.message);
    // If Gemini fails, allow the report to proceed (fail-safe)
    return true;
  }
};
