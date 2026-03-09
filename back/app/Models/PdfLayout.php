<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PdfLayout extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'document_type',
        'header_html',
        'footer_html',
    ];
}

