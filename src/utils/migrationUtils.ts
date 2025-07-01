import { db } from "../db";
import { SessionManager } from "./sessionManager";

// Default session ID for our single session
export const MAIN_SESSION_ID = 1;

/**
 * Migration utility to help transition from multi-session to single-session
 * This utility will:
 * 1. Check if we have a main session
 * 2. If not, look for the most recent session and use it as our main session
 * 3. Otherwise, create an empty main session
 */
export async function ensureMainSession(): Promise<void> {
  try {
    console.log("Checking for main session...");
    
    // Try to get the main session
    const mainSession = await SessionManager.getSession(MAIN_SESSION_ID);
    
    // If main session exists, we're good
    if (mainSession) {
      console.log("Main session already exists.");
      return;
    }
    
    console.log("Main session not found, looking for most recent session...");
    
    // Get all sessions ordered by last modified date
    const sessions = await db.sessions.orderBy("lastModified").reverse().toArray();
    
    if (sessions.length > 0) {
      // Use the most recently modified session as our main session
      const mostRecentSession = sessions[0];
      console.log(`Using most recent session "${mostRecentSession.title}" as main session`);
      
      // Create main session with the same content
      await db.sessions.put({
        ...mostRecentSession,
        id: MAIN_SESSION_ID,
        title: mostRecentSession.title || "Main Session",
      });
      
      console.log("Migration complete: Main session created from most recent session");
    } else {
      // No sessions found, create a new empty one
      console.log("No existing sessions found, creating empty main session");
      
      // Create empty document
      const emptyDocument = {
        type: "doc",
        content: [{ type: "paragraph", content: [] }]
      };
      
      // Create a new session
      await SessionManager.createSession("Main Session", emptyDocument);
      console.log("Migration complete: Empty main session created");
    }
  } catch (error) {
    console.error("Error during session migration:", error);
    throw new Error(`Failed to migrate sessions: ${error}`);
  }
} 