<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClientRequest;
use App\Http\Requests\UpdateClientRequest;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Client::class);

        $query = Client::query()->with('assignedSales');

        $search = $request->query('q', $request->query('search'));

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('contact_name', 'like', '%' . $search . '%')
                    ->orWhere('company_name', 'like', '%' . $search . '%')
                    ->orWhere('name', 'like', '%' . $search . '%')
                    ->orWhere('phone', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%');
            });
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($assignedSalesId = $request->query('assigned_sales_id')) {
            $query->where('assigned_sales_id', $assignedSalesId);
        }

        if ($source = $request->query('source')) {
            $query->where('lead_source', $source);
        }

        $sort = $request->query('sort', 'client');
        $direction = strtolower($request->query('direction', 'asc')) === 'desc' ? 'desc' : 'asc';

        $sortColumn = match ($sort) {
            'client' => 'contact_name',
            'company' => 'company_name',
            'shipments' => 'shipments_count',
            'profit' => 'total_profit',
            'last_contact' => 'last_contact_at',
            default => 'contact_name',
        };

        $query->orderBy($sortColumn, $direction);

        $clients = $query->get();

        return response()->json([
            'data' => $clients->map(fn (Client $client) => $this->transformClient($client)),
        ]);
    }

    public function store(StoreClientRequest $request)
    {
        $this->authorize('create', Client::class);

        $client = Client::create($request->validated());

        return response()->json([
            'data' => $this->transformClient($client->fresh('assignedSales')),
        ], 201);
    }

    public function show(Client $client)
    {
        $this->authorize('view', $client);

        $client->load('assignedSales', 'contacts');

        return response()->json([
            'data' => $this->transformClientDetail($client),
        ]);
    }

    public function update(UpdateClientRequest $request, Client $client)
    {
        $this->authorize('update', $client);

        $client->fill($request->validated());
        $client->save();

        return response()->json([
            'data' => $this->transformClient($client->fresh('assignedSales')),
        ]);
    }

    public function destroy(Client $client)
    {
        $this->authorize('delete', $client);

        $client->delete();

        return response()->json([
            'message' => 'Client deleted.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function transformClient(Client $client): array
    {
        $lastContactAt = $client->last_contact_at;
        $lastContactAgeDays = null;

        if ($lastContactAt instanceof Carbon) {
            $lastContactAgeDays = $lastContactAt->diffInDays(Carbon::now());
        }

        return [
            'id' => $client->id,
            // Basic info (matches add form order)
            'client_name' => $client->contact_name ?? $client->name,
            'company_name' => $client->company_name ?? $client->name,
            'company_type' => $client->company_type,
            'business_activity' => $client->business_activity,
            'target_markets' => $client->target_markets,
            'shipping_problems' => $client->shipping_problems,
            'preferred_comm_method' => $client->preferred_comm_method,
            'phone' => $client->phone,
            'email' => $client->email,
            'interest_level' => $client->interest_level,
            'address' => $client->address,
            'website_url' => $client->website_url,
            'tax_id' => $client->tax_id,
            'facebook_url' => $client->facebook_url,
            'linkedin_url' => $client->linkedin_url,
            // List metrics & status
            'status' => $client->status,
            'source' => $client->lead_source,
            'shipments' => $client->shipments_count,
            'profit' => $client->total_profit,
            'last_contact_at' => $lastContactAt,
            'last_contact_age_days' => $lastContactAgeDays,
            'sales_rep' => $client->assignedSales?->name,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function transformClientDetail(Client $client): array
    {
        $base = $this->transformClient($client);

        $details = [
            // Location & extra metadata (after basic form fields)
            'city' => $client->city,
            'country' => $client->country,
            // Source & sales context extras
            'lead_source_other' => $client->lead_source_other,
            'default_payment_terms' => $client->default_payment_terms,
            'default_currency' => $client->default_currency,
            // Decision maker info
            'decision_maker_name' => $client->decision_maker_name,
            'decision_maker_title' => $client->decision_maker_title,
            'decision_maker_title_other' => $client->decision_maker_title_other,
            // Sales guidance notes
            'current_need' => $client->current_need,
            'pain_points' => $client->pain_points,
            'opportunity' => $client->opportunity,
            'special_requirements' => $client->special_requirements,
            'notes' => $client->notes,
            // Contacts
            'contacts' => $client->contacts->map(function ($contact) {
                return [
                    'id' => $contact->id,
                    'name' => $contact->name,
                    'position' => $contact->position,
                    'email' => $contact->email,
                    'phone' => $contact->phone,
                    'is_primary' => (bool) $contact->is_primary,
                ];
            }),
        ];

        return array_merge($base, $details);
    }
}

