<?php

namespace App\Policies;

use App\Models\Note;
use App\Models\User;

class NotePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('notes.view');
    }

    public function view(User $user, Note $note): bool
    {
        return $user->can('notes.view') || $note->author_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->can('notes.manage');
    }

    public function update(User $user, Note $note): bool
    {
        if ($user->can('notes.manage')) {
            return true;
        }

        return $note->author_id === $user->id;
    }

    public function delete(User $user, Note $note): bool
    {
        return $user->can('notes.manage');
    }
}

