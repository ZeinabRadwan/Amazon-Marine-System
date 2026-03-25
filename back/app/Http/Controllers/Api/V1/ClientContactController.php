<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClientContactRequest;
use App\Http\Requests\UpdateClientContactRequest;
use App\Models\Client;
use App\Models\ClientContact;

class ClientContactController extends Controller
{
    public function index(Client $client)
    {
        $this->authorize('view', $client);

        return response()->json([
            'data' => $client->contacts()->orderByDesc('is_primary')->orderBy('name')->get(),
        ]);
    }

    public function store(StoreClientContactRequest $request, Client $client)
    {
        $this->authorize('update', $client);

        $contact = $client->contacts()->create($request->validated());

        return response()->json([
            'data' => $contact,
        ], 201);
    }

    public function update(UpdateClientContactRequest $request, Client $client, ClientContact $contact)
    {
        $this->authorize('update', $client);

        if ($contact->client_id !== $client->id) {
            abort(404);
        }

        $contact->fill($request->validated());
        $contact->save();

        return response()->json([
            'data' => $contact,
        ]);
    }

    public function destroy(Client $client, ClientContact $contact)
    {
        $this->authorize('update', $client);

        if ($contact->client_id !== $client->id) {
            abort(404);
        }

        $contact->delete();

        return response()->json([
            'message' => __('Contact deleted.'),
        ]);
    }
}

