<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\CommunicationLog;
use App\Models\CommunicationLogType;
use App\Models\Shipment;
use App\Models\ShipmentTrackingUpdate;
use App\Models\Ticket;
use App\Models\TicketPriority;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Database\Seeder;

class CustomerServiceSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();
        $clients = Client::orderBy('id')->take(4)->get();
        $shipments = Shipment::orderBy('id')->take(3)->get();

        if ($user === null || $clients->isEmpty()) {
            return;
        }

        $client1 = $clients[0];
        $client2 = $clients[1] ?? $client1;
        $client3 = $clients[2] ?? $client1;
        $shipment1 = $shipments->first();

        $this->seedTickets($user, $client1, $client2, $client3, $shipment1);
        $this->seedShipmentTrackingUpdates($user, $shipment1, $shipments);
        $this->seedCommunicationLogs($user, $client1, $client2, $shipment1);
    }

    private function seedTickets(User $user, Client $c1, Client $c2, Client $c3, ?Shipment $shipment): void
    {
        $tickets = [
            [
                'client_id' => $c1->id,
                'shipment_id' => $shipment?->id,
                'ticket_number' => 'TKT-2026-0001',
                'subject' => 'استفسار عن موعد وصول الشحنة BL',
                'description' => 'العميل يطلب تحديثًا بموعد وصول الحاوية إلى جدة.',
                'type' => 'inquiry',
                'status' => 'in_progress',
                'priority' => 'medium',
            ],
            [
                'client_id' => $c2->id,
                'shipment_id' => null,
                'ticket_number' => 'TKT-2026-0002',
                'subject' => 'شكوى من تأخر الفاتورة',
                'description' => 'العميل يشكو من تأخر استلام الفاتورة المرسلة بالبريد.',
                'type' => 'complaint',
                'status' => 'open',
                'priority' => 'high',
            ],
            [
                'client_id' => $c1->id,
                'shipment_id' => null,
                'ticket_number' => 'TKT-2026-0003',
                'subject' => 'طلب نسخة من بوليصة الشحن',
                'description' => 'العميل يطلب نسخة مصورة من البوليصة.',
                'type' => 'request',
                'status' => 'closed',
                'priority' => 'low',
            ],
            [
                'client_id' => $c3->id,
                'shipment_id' => null,
                'ticket_number' => 'TKT-2026-0004',
                'subject' => 'استفسار عن التخليص الجمركي',
                'description' => 'استفسار بخصوص موعد بدء إجراءات التخليص.',
                'type' => 'inquiry',
                'status' => 'waiting',
                'priority' => 'medium',
            ],
        ];

        foreach ($tickets as $data) {
            $typeName = $data['type'];
            $priorityName = $data['priority'];
            unset($data['type'], $data['priority']);
            $data['ticket_type_id'] = TicketType::where('name', $typeName)->first()?->id;
            $data['priority_id'] = TicketPriority::where('name', $priorityName)->first()?->id;
            if ($data['ticket_type_id'] === null || $data['priority_id'] === null) {
                continue;
            }
            Ticket::updateOrCreate(
                ['ticket_number' => $data['ticket_number']],
                array_merge($data, [
                    'created_by_id' => $user->id,
                    'assigned_to_id' => $user->id,
                ])
            );
        }
    }

    private function seedShipmentTrackingUpdates(User $user, ?Shipment $shipment, $shipments): void
    {
        if ($shipment === null) {
            return;
        }

        $updates = [
            ['update_text' => 'تم تأكيد الحجز — انتظار تخصيص الحاوية.'],
            ['update_text' => 'تم تخصيص الحاوية — التحميل قيد التنفيذ في الميناء.'],
            ['update_text' => 'السفينة غادرت الميناء — الشحنة في البحر متجهة إلى جدة.'],
        ];

        foreach ($updates as $i => $data) {
            ShipmentTrackingUpdate::firstOrCreate(
                [
                    'shipment_id' => $shipment->id,
                    'update_text' => $data['update_text'],
                ],
                [
                    'created_by_id' => $user->id,
                    'created_at' => now()->subDays(count($updates) - $i),
                ]
            );
        }

        if ($shipments->count() > 1) {
            $second = $shipments->get(1);
            ShipmentTrackingUpdate::firstOrCreate(
                [
                    'shipment_id' => $second->id,
                    'update_text' => 'وصول الميناء — بدء التخليص الجمركي.',
                ],
                ['created_by_id' => $user->id]
            );
        }
    }

    private function seedCommunicationLogs(User $user, Client $c1, Client $c2, ?Shipment $shipment): void
    {
        $ticket1 = Ticket::where('ticket_number', 'TKT-2026-0001')->first();

        $typeCall = CommunicationLogType::where('name', 'call')->first();
        $typeEmail = CommunicationLogType::where('name', 'email')->first();
        $typeNote = CommunicationLogType::where('name', 'note')->first();
        $typeWhatsapp = CommunicationLogType::where('name', 'whatsapp')->first();

        if (! $typeCall || ! $typeEmail || ! $typeNote || ! $typeWhatsapp) {
            return;
        }

        $logs = [
            [
                'client_id' => $c1->id,
                'shipment_id' => $shipment?->id,
                'ticket_id' => null,
                'communication_log_type_id' => $typeCall->id,
                'subject' => 'استفسار عن موعد وصول BL',
                'client_said' => 'العميل سأل عن الموعد المتوقع للوصول.',
                'reply' => 'تم إبلاغه بأن الشحنة في البحر والوصول متوقع خلال ٥ أيام.',
                'occurred_at' => now()->subDays(1),
            ],
            [
                'client_id' => $c2->id,
                'shipment_id' => null,
                'ticket_id' => $ticket1?->id,
                'communication_log_type_id' => $typeEmail->id,
                'subject' => 'رد على استفسار الفاتورة',
                'client_said' => null,
                'reply' => 'تم إرسال نسخة الفاتورة بالبريد الإلكتروني.',
                'occurred_at' => now()->subDays(2),
            ],
            [
                'client_id' => $c1->id,
                'shipment_id' => $shipment?->id,
                'ticket_id' => null,
                'communication_log_type_id' => $typeNote->id,
                'subject' => 'تم إبلاغ العميل ببدء التخليص الجمركي',
                'issue' => 'متابعة حالة التخليص.',
                'reply' => 'تم التواصل مع العميل وإبلاغه بالخطوات التالية.',
                'occurred_at' => now()->subDays(3),
            ],
            [
                'client_id' => $c1->id,
                'shipment_id' => null,
                'ticket_id' => null,
                'communication_log_type_id' => $typeWhatsapp->id,
                'subject' => 'تحديث حالة الشحنة',
                'client_said' => 'العميل أكد استلام التحديث.',
                'occurred_at' => now()->subHours(5),
            ],
        ];

        foreach ($logs as $data) {
            CommunicationLog::updateOrCreate(
                [
                    'client_id' => $data['client_id'],
                    'subject' => $data['subject'],
                    'communication_log_type_id' => $data['communication_log_type_id'],
                ],
                array_merge($data, ['created_by_id' => $user->id])
            );
        }
    }
}
