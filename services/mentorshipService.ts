import { db, FieldValue } from './firebase';
import { MentorshipPair, MentorshipNote, MentorshipNoteVisibility, MentorshipNoteType } from '../types';

export const mentorshipService = {
  pairId(mentorId: string, menteeId: string) {
    return `${mentorId}_${menteeId}`;
  },

  async upsertPair(orgId: string, mentorId: string, menteeId: string) {
    const id = `${mentorId}_${menteeId}`;
    const ref = db.collection('users').doc(orgId)
      .collection('mentorship').doc('mentorshipPairs')
      .collection('pairs').doc(id);
    await ref.set({
      id, mentorId, menteeId, active: true, createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return id;
  },

  async getPair(orgId: string, pairId: string): Promise<MentorshipPair | null> {
    const doc = await db.collection('users').doc(orgId)
      .collection('mentorship').doc('mentorshipPairs')
      .collection('pairs').doc(pairId).get();
    return doc.exists ? doc.data() as MentorshipPair : null;
  },

  async getAllPairs(orgId: string): Promise<MentorshipPair[]> {
    const snapshot = await db.collection('users').doc(orgId)
      .collection('mentorship').doc('mentorshipPairs')
      .collection('pairs').get();
    return snapshot.docs.map(doc => doc.data() as MentorshipPair);
  },

  async getPairsForMember(orgId: string, memberId: string): Promise<MentorshipPair[]> {
    const snapshot = await db.collection('users').doc(orgId)
      .collection('mentorship').doc('mentorshipPairs')
      .collection('pairs')
      .where('active', '==', true)
      .get();
    
    return snapshot.docs
      .map(doc => doc.data() as MentorshipPair)
      .filter(pair => pair.mentorId === memberId || pair.menteeId === memberId);
  },

  async deactivatePair(orgId: string, pairId: string) {
    await db.collection('users').doc(orgId)
      .collection('mentorship').doc('mentorshipPairs')
      .collection('pairs').doc(pairId)
      .update({ active: false });
  },

  notesRef(orgId: string, pairId: string) {
    return db.collection('users').doc(orgId)
      .collection('mentorship').doc('mentorshipPairs')
      .collection('pairs').doc(pairId)
      .collection('notes');
  },

  async addNote(orgId: string, pairId: string, note: Omit<MentorshipNote, 'id' | 'createdAt'>) {
    const ref = this.notesRef(orgId, pairId).doc();
    await ref.set({
      ...note,
      id: ref.id,
      createdAt: FieldValue.serverTimestamp()
    });
    return ref.id;
  },

  async getNotes(orgId: string, pairId: string): Promise<MentorshipNote[]> {
    const snapshot = await this.notesRef(orgId, pairId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => doc.data() as MentorshipNote);
  },

  watchNotes(orgId: string, pairId: string, onSnapshot: (arr: MentorshipNote[]) => void) {
    return this.notesRef(orgId, pairId)
      .orderBy('createdAt', 'desc')
      .onSnapshot(snap => {
        const data = snap.docs.map(d => d.data() as MentorshipNote);
        onSnapshot(data);
      });
  },

  async updateNote(orgId: string, pairId: string, noteId: string, updates: Partial<MentorshipNote>) {
    await this.notesRef(orgId, pairId).doc(noteId).update(updates);
  },

  async deleteNote(orgId: string, pairId: string, noteId: string) {
    await this.notesRef(orgId, pairId).doc(noteId).delete();
  },

  // Helper to check if user can view a note based on visibility
  canViewNote(note: MentorshipNote, userUid: string, isAdmin: boolean, pair: MentorshipPair): boolean {
    if (isAdmin) return true; // Admins can see all notes
    
    switch (note.visibility) {
      case 'mentor':
        return pair.mentorId === userUid;
      case 'mentee':
        return pair.menteeId === userUid;
      case 'both':
        return pair.mentorId === userUid || pair.menteeId === userUid;
      case 'officers':
        return isAdmin;
      default:
        return false;
    }
  }
};
