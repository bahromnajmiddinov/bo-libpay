from django.db import models
from django.contrib.auth.models import AbstractUser


class CustomUser(AbstractUser):
    pass


class Organization(models.Model):
    name = models.CharField(max_length=100)
    owner = models.OneToOneField(CustomUser,
                                 on_delete=models.CASCADE,
                                 related_name="organization")

    def __str__(self):
        return self.name
