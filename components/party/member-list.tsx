"use client";

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getUserId } from '@/lib/party/session';

// List of famous directors' last names
const DIRECTORS = [
  'Kubrick', 'Scorsese', 'Tarantino', 'Nolan', 'Fincher', 'Coppola', 'Spielberg',
  'Lynch', 'Anderson', 'Wong', 'Kurosawa', 'Bergman', 'Tarkovsky', 'Fellini',
  'Godard', 'Hitchcock', 'Welles', 'Polanski', 'Allen', 'Malick',
  'Cronenberg', 'Villeneuve', 'Aronofsky', 'Refn', 'Jarmusch', 'Herzog',
  'Haneke', 'Von Trier', 'Almodóvar', 'Del Toro', 'Cuarón', 'Iñárritu',
  'Bong', 'Park', 'Lee', 'Zhang', 'Miyazaki', 'Ozu', 'Mizoguchi'
];

// Generate a consistent "random" name based on user_id
function getDirectorName(userId: string): string {
  // Use a simple hash of the user_id to get a consistent index
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % DIRECTORS.length;
  return DIRECTORS[index];
}

interface MemberListProps {
  members: Array<{
    id: string;
    user_id: string;
    role: 'host' | 'member';
    has_submitted_preferences: boolean;
    has_completed_swiping: boolean;
    swipes_completed: number;
  }>;
  totalMovies?: number;
}

export function MemberList({ members, totalMovies = 10 }: MemberListProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user ID
  useEffect(() => {
    getUserId().then(setCurrentUserId);
  }, []);

  // Assign director names to members (consistent based on user_id)
  const membersWithNames = useMemo(() => {
    return members.map(member => {
      const isCurrentUser = currentUserId && member.user_id === currentUserId;
      const baseName = member.role === 'host' 
        ? '👑 Host' 
        : getDirectorName(member.user_id);
      
      return {
        ...member,
        displayName: isCurrentUser ? `${baseName} (you)` : baseName
      };
    });
  }, [members, currentUserId]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Members ({members.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {membersWithNames.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-2 rounded"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {member.displayName}
                </span>
                {member.has_submitted_preferences && (
                  <Badge variant="outline" className="text-xs">
                    Preferences ✓
                  </Badge>
                )}
                {member.has_completed_swiping && (
                  <Badge variant="outline" className="text-xs">
                    Done ✓
                  </Badge>
                )}
              </div>
              {member.swipes_completed > 0 && (
                <span className="text-sm text-gray-600">
                  {member.swipes_completed}/{totalMovies} swipes
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

