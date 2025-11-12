import { db } from './firebase';

export interface KnowledgeContent {
  id: string; // e.g., 'new-member-journey', 'club-overview'
  title: string;
  content: string; // HTML content
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
  ownerId: string; // Club owner ID
}

export interface KnowledgeSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  isFeatured?: boolean;
}

export const knowledgeService = {
  // Get content for a specific page
  async getContent(ownerId: string, pageId: string): Promise<KnowledgeContent | null> {
    try {
      const doc = await db
        .collection('users')
        .doc(ownerId)
        .collection('knowledgeContent')
        .doc(pageId)
        .get();

      if (doc.exists) {
        return doc.data() as KnowledgeContent;
      }
      return null;
    } catch (error) {
      console.error('Error fetching knowledge content:', error);
      return null;
    }
  },

  // Save/update content
  async saveContent(
    ownerId: string,
    pageId: string,
    title: string,
    content: string,
    userEmail: string
  ): Promise<void> {
    try {
      await db
        .collection('users')
        .doc(ownerId)
        .collection('knowledgeContent')
        .doc(pageId)
        .set({
          id: pageId,
          title,
          content,
          lastUpdatedBy: userEmail,
          lastUpdatedAt: new Date().toISOString(),
          ownerId,
        });
    } catch (error) {
      console.error('Error saving knowledge content:', error);
      throw error;
    }
  },

  // Listen to content changes in real-time
  subscribeToContent(
    ownerId: string,
    pageId: string,
    callback: (content: KnowledgeContent | null) => void
  ): () => void {
    const unsubscribe = db
      .collection('users')
      .doc(ownerId)
      .collection('knowledgeContent')
      .doc(pageId)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            callback(doc.data() as KnowledgeContent);
          } else {
            callback(null);
          }
        },
        (error) => {
          console.error('Error listening to knowledge content:', error);
          callback(null);
        }
      );

    return unsubscribe;
  },

  // Get all knowledge sections
  async getSections(ownerId: string): Promise<KnowledgeSection[]> {
    try {
      const snapshot = await db
        .collection('users')
        .doc(ownerId)
        .collection('knowledgeSections')
        .orderBy('order')
        .get();

      return snapshot.docs.map((doc) => doc.data() as KnowledgeSection);
    } catch (error) {
      console.error('Error fetching knowledge sections:', error);
      return [];
    }
  },

  // Save/update a section
  async saveSection(
    ownerId: string,
    section: KnowledgeSection
  ): Promise<void> {
    try {
      await db
        .collection('users')
        .doc(ownerId)
        .collection('knowledgeSections')
        .doc(section.id)
        .set(section);
    } catch (error) {
      console.error('Error saving knowledge section:', error);
      throw error;
    }
  },

  // Delete a section
  async deleteSection(ownerId: string, sectionId: string): Promise<void> {
    try {
      await db
        .collection('users')
        .doc(ownerId)
        .collection('knowledgeSections')
        .doc(sectionId)
        .delete();
    } catch (error) {
      console.error('Error deleting knowledge section:', error);
      throw error;
    }
  },

  // Subscribe to sections changes
  subscribeSections(
    ownerId: string,
    callback: (sections: KnowledgeSection[]) => void
  ): () => void {
    const unsubscribe = db
      .collection('users')
      .doc(ownerId)
      .collection('knowledgeSections')
      .orderBy('order')
      .onSnapshot(
        (snapshot) => {
          const sections = snapshot.docs.map((doc) => doc.data() as KnowledgeSection);
          callback(sections);
        },
        (error) => {
          console.error('Error listening to knowledge sections:', error);
          callback([]);
        }
      );

    return unsubscribe;
  },
};
