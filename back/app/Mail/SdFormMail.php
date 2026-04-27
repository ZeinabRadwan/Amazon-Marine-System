<?php

namespace App\Mail;

use App\Models\SDForm;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SdFormMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public SDForm $form,
        private readonly string $pdfBinary,
        private readonly string $pdfFilename,
    ) {}

    public function build(): self
    {
        $subject = sprintf('SD %s sent to operations', $this->form->sd_number ?? ('#'.$this->form->id));

        return $this->subject($subject)
            ->view('emails.sd_form_plain', [
                'form' => $this->form,
            ])
            ->attachData($this->pdfBinary, $this->pdfFilename, [
                'mime' => 'application/pdf',
            ]);
    }
}
