<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>SD Form {{ $form->sd_number ?? ('#' . $form->id) }}</title>
</head>
<body>
    <h2>SD Form {{ $form->sd_number ?? ('#' . $form->id) }}</h2>

    <p>
        <strong>Client:</strong>
        {{ $form->client?->name ?? '—' }}
    </p>

    <p>
        <strong>POL → POD:</strong>
        {{ $form->pol?->name ?? $form->pol_text ?? '—' }}
        →
        {{ $form->pod?->name ?? $form->pod_text ?? '—' }}
    </p>

    <p>
        <strong>Shipping Line:</strong>
        {{ $form->shipping_line ?? '—' }}
    </p>

    <p>
        <strong>Shipment Direction:</strong>
        {{ $form->shipment_direction ?? '—' }}
    </p>

    <p>
        <strong>Cargo:</strong>
        {{ $form->cargo_description ?? '—' }}
    </p>

    <p>
        <strong>Containers:</strong>
        {{ $form->num_containers ?? '—' }}
        ×
        {{ $form->container_size ?? '—' }}
        ({{ $form->container_type ?? '—' }})
    </p>

    <p>
        <strong>Requested Vessel Date:</strong>
        {{ optional($form->requested_vessel_date)->toDateString() ?? '—' }}
    </p>

    <p>
        This SD form was sent to operations from the Amazon Marine system.
    </p>
</body>
</html>

