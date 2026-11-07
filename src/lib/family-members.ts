"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, FamilyMember } from "./db";

export function useFamilyMembers() {
    const members = useLiveQuery(() => db.members.orderBy('name').toArray(), []);

    useEffect(() => {
        if (members && members.length === 0) {
            db.members.add({ name: 'Self' }).catch(() => {
                // Another component may have seeded it first (unique name index).
            });
        }
    }, [members]);

    const names = (members || []).map(member => member.name);

    return {
        members: members || [],
        names,
        isLoading: members === undefined,
    };
}

export async function addFamilyMember(name: string): Promise<FamilyMember> {
    const cleanName = name.trim();
    if (!cleanName) {
        throw new Error('Please enter a family member name');
    }

    const existing = await db.members.toArray();
    if (existing.some(member => member.name.toLowerCase() === cleanName.toLowerCase())) {
        throw new Error(`${cleanName} already exists`);
    }

    const id = await db.members.add({ name: cleanName });
    return { id, name: cleanName };
}

export async function removeFamilyMember(member: FamilyMember): Promise<void> {
    if (member.name === 'Self') {
        throw new Error('Self cannot be removed');
    }

    await db.transaction('rw', db.items, db.files, db.members, async () => {
        await db.items.filter(item => (item.owner || 'Self') === member.name).delete();
        await db.files.filter(file => (file.owner || 'Self') === member.name).delete();
        if (member.id !== undefined) {
            await db.members.delete(member.id);
        }
    });
}
