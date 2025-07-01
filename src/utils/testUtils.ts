import { db } from "../db";
import { MAIN_SESSION_ID } from "./migrationUtils";

// Check if we're in development mode
const isDev = import.meta.env.MODE === "development";

/**
 * Utility to help test the single-session implementation
 * This can be exposed in development mode via a debug menu or console API
 */
export const SingleSessionTestUtils = {
  /**
   * Reset the main session to an empty state
   * Only available in development mode
   */
  async resetMainSession(): Promise<void> {
    if (!isDev) {
      console.warn("Test utilities are only available in development mode");
      return;
    }
    
    try {
      // Delete the main session if it exists
      await db.sessions.delete(MAIN_SESSION_ID);
      console.log("Main session has been reset");
    } catch (error) {
      console.error("Error resetting main session:", error);
    }
  },
  
  /**
   * Print information about the current state of sessions
   * Only available in development mode
   */
  async debugSessions(): Promise<void> {
    if (!isDev) {
      console.warn("Test utilities are only available in development mode");
      return;
    }
    
    try {
      const allSessions = await db.sessions.toArray();
      const mainSession = allSessions.find(s => s.id === MAIN_SESSION_ID);
      
      console.group("Session Debug Info");
      console.log(`Total sessions: ${allSessions.length}`);
      console.log(`Main session exists: ${!!mainSession}`);
      
      if (mainSession) {
        console.group("Main Session Details");
        console.log(`Title: ${mainSession.title}`);
        console.log(`Status: ${mainSession.status}`);
        console.log(`Last modified: ${mainSession.lastModified}`);
        console.log(`Has input content: ${!!mainSession.inputContent}`);
        console.log(`Has analyzed content: ${!!mainSession.analysedContent}`);
        console.groupEnd();
      }
      
      console.groupEnd();
    } catch (error) {
      console.error("Error debugging sessions:", error);
    }
  }
};

// Register test utilities in development mode
if (isDev) {
  // @ts-ignore - Add to window for console access
  window.lodestoneTest = SingleSessionTestUtils;
} 