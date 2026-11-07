"use client";

import { useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useFamilyMembers, addFamilyMember, removeFamilyMember } from "@/lib/family-members";
import { growwClient } from "@/lib/api/groww-client";
import { indMoneyClient } from "@/lib/api/indmoney-client";
import { vestedClient } from "@/lib/api/vested-client";
import { zerodhaClient } from "@/lib/api/zerodha-client";
import { FamilyMember } from "@/lib/db";

interface FamilyMembersDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onChanged?: () => void;
}

export function FamilyMembersDialog({ open, onOpenChange, onChanged }: FamilyMembersDialogProps) {
    const { members } = useFamilyMembers();
    const [newName, setNewName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAdd = async () => {
        if (!newName.trim()) return;

        setIsAdding(true);
        try {
            await addFamilyMember(newName);
            toast.success(`${newName.trim()} added`);
            setNewName('');
            onChanged?.();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to add family member');
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemove = async (member: FamilyMember) => {
        if (!confirm(`Remove ${member.name} and all portfolio data associated with them?`)) {
            return;
        }

        try {
            // Best-effort: drop any live broker sessions for this member too.
            await Promise.allSettled([
                growwClient.disconnect(member.name),
                indMoneyClient.disconnect(member.name),
                vestedClient.disconnect(member.name),
                zerodhaClient.disconnect(member.name),
            ]);
            await removeFamilyMember(member);
            toast.success(`${member.name} removed`);
            onChanged?.();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to remove family member');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Family Members
                    </DialogTitle>
                    <DialogDescription>
                        Members can be selected when connecting a broker, importing a file, or adding manual assets.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        {members.map(member => (
                            <div key={member.id ?? member.name} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                                <div>
                                    <p className="font-medium">{member.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {member.name === 'Self' ? 'Default member' : 'Family member'}
                                    </p>
                                </div>
                                {member.name !== 'Self' && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleRemove(member)}
                                        title={`Remove ${member.name}`}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 border-t border-border/50 pt-4">
                        <Input
                            value={newName}
                            onChange={(event) => setNewName(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    void handleAdd();
                                }
                            }}
                            placeholder="e.g. Spouse, Father"
                        />
                        <Button onClick={handleAdd} disabled={isAdding || !newName.trim()} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add
                        </Button>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
