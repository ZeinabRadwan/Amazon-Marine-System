<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OfficeLocation extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'lat',
        'lng',
        'radius_meters',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'lat' => 'float',
            'lng' => 'float',
            'radius_meters' => 'integer',
        ];
    }

    public static function singletonId(): int
    {
        return 1;
    }

    public static function current(): ?self
    {
        return self::query()->where('id', self::singletonId())->first()
            ?? self::query()->orderBy('id')->first();
    }

    /**
     * @param  array{lat?: float|null, lng?: float|null, radius_meters?: int|null}  $attributes
     */
    public static function upsertSingleton(array $attributes): self
    {
        /** @var self */
        return self::query()->updateOrCreate(
            ['id' => self::singletonId()],
            $attributes
        );
    }
}
