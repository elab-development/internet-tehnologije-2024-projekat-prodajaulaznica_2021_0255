<?php


namespace App\Mail;


use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\Ticket;


class TicketPurchaseConfirmation extends Mailable
{
    use Queueable, SerializesModels;


    public $ticket;
    public $qrCodePath;


    public function __construct(Ticket $ticket, $qrCodePath = null)
    {
        $this->ticket = $ticket;
        $this->qrCodePath = $qrCodePath;
    }


    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Potvrda kupovine karte - ' . $this->ticket->event->name,
        );
    }


    public function content(): Content
    {
        return new Content(
            view: 'emails.ticket-purchase-confirmation',
            with: [
                'ticket' => $this->ticket,
                'event' => $this->ticket->event,
                'user' => $this->ticket->user,
                'qrCodePath' => $this->qrCodePath,
            ],
        );
    }


    public function attachments(): array
    {
        $attachments = [];
        
        // Attach QR code if available
        if ($this->qrCodePath && file_exists(storage_path('app/public/' . $this->qrCodePath))) {
            $attachments[] = [
                'path' => storage_path('app/public/' . $this->qrCodePath),
                'name' => 'qr-code-' . $this->ticket->ticket_number . '.png',
                'mime' => 'image/png',
            ];
        }
        
        return $attachments;
    }
}
